import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getProjectPath, getProjectSubPath } from "@/lib/project-fs";
import { generateThumbnails, needsRegeneration } from "@/lib/watcher/thumbnail-generator";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/scan - Scan for .pptx files and register them as exports
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const projectPath = getProjectPath(id);
    const outputPath = getProjectSubPath(id, "output");

    // Directories to scan for .pptx files
    const dirsToScan = [projectPath, outputPath];
    const foundFiles: { path: string; relativePath: string; stats: { size: number; mtime: Date } }[] = [];

    for (const dir of dirsToScan) {
      if (!existsSync(dir)) continue;

      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith(".pptx")) {
          const fullPath = path.join(dir, file);
          const fileStats = await stat(fullPath);
          const relativePath = path.relative(projectPath, fullPath);

          foundFiles.push({
            path: fullPath,
            relativePath,
            stats: { size: fileStats.size, mtime: fileStats.mtime },
          });
        }
      }
    }

    // Register new exports for files not yet in database
    const newExports = [];
    let thumbnailsGenerated = 0;

    for (const file of foundFiles) {
      // Check if export already exists for this file
      const existing = await prisma.export.findFirst({
        where: {
          projectId: id,
          outputPath: file.relativePath,
        },
      });

      // Generate thumbnails if needed
      const filename = path.basename(file.relativePath);
      if (needsRegeneration(id, file.relativePath)) {
        console.log(`[Scan] Generating thumbnails for ${filename}...`);
        const result = await generateThumbnails(id, file.relativePath);
        if (result.success) {
          thumbnailsGenerated = result.slideCount;
          console.log(`[Scan] Generated ${result.slideCount} thumbnails`);

          // Update existing export with slide count or create new
          if (existing) {
            await prisma.export.update({
              where: { id: existing.id },
              data: { slideCount: result.slideCount },
            });
          }
        } else {
          console.error(`[Scan] Thumbnail generation failed: ${result.error}`);
        }
      }

      if (!existing) {
        // Create new export record
        const newExport = await prisma.export.create({
          data: {
            projectId: id,
            format: "pptx",
            outputPath: file.relativePath,
            fileSize: file.stats.size,
            slideCount: thumbnailsGenerated,
            status: "completed",
          },
        });
        newExports.push(newExport);
      }
    }

    // Get all exports for this project
    const allExports = await prisma.export.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        scannedFiles: foundFiles.length,
        newExports: newExports.length,
        thumbnailsGenerated,
        exports: allExports,
      },
    });
  } catch (error) {
    console.error("Error scanning project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to scan project" },
      { status: 500 }
    );
  }
}
