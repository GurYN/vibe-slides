import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getProjectPath, getProjectSubPath } from "@/lib/project-fs";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/download - Download the latest .pptx file
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("file");

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

    let targetFile: string | null = null;

    if (filename) {
      // Download specific file
      const filePath = path.join(projectPath, filename);
      if (existsSync(filePath) && filename.endsWith(".pptx")) {
        targetFile = filePath;
      }
    } else {
      // Find the latest .pptx file
      const dirsToScan = [projectPath, outputPath];
      let latestFile: { path: string; mtime: Date } | null = null;

      for (const dir of dirsToScan) {
        if (!existsSync(dir)) continue;

        const files = await readdir(dir);
        for (const file of files) {
          if (file.endsWith(".pptx")) {
            const fullPath = path.join(dir, file);
            const fileStats = await stat(fullPath);

            if (!latestFile || fileStats.mtime > latestFile.mtime) {
              latestFile = { path: fullPath, mtime: fileStats.mtime };
            }
          }
        }
      }

      if (latestFile) {
        targetFile = latestFile.path;
      }
    }

    if (!targetFile || !existsSync(targetFile)) {
      return NextResponse.json(
        { success: false, error: "No presentation file found" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(targetFile);
    const downloadFilename = path.basename(targetFile);

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download file" },
      { status: 500 }
    );
  }
}
