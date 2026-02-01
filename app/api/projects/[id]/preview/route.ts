import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getProjectSubPath } from "@/lib/project-fs";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/preview - Get slide preview thumbnails
export async function GET(
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

    // Check if thumbnails directory exists
    const thumbnailsDir = getProjectSubPath(id, "thumbnails");
    if (!existsSync(thumbnailsDir)) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Read thumbnails directory
    const files = await readdir(thumbnailsDir);

    // Filter for slide thumbnails (pattern: slide_N.png or slide_N.webp)
    const slidePattern = /^slide_(\d+)\.(png|webp|jpg)$/;
    const slidesPromises = files
      .filter((f) => slidePattern.test(f))
      .map(async (f) => {
        const match = f.match(slidePattern);
        const filePath = path.join(thumbnailsDir, f);
        const fileStat = await stat(filePath);
        // Add mtime as cache-buster to force fresh loads
        const cacheBuster = fileStat.mtime.getTime();
        return {
          slideNumber: parseInt(match![1], 10),
          thumbnailPath: `/api/projects/${id}/preview/${f}?v=${cacheBuster}`,
          filename: f,
        };
      });

    const slides = (await Promise.all(slidesPromises))
      .sort((a, b) => a.slideNumber - b.slideNumber);

    return NextResponse.json({
      success: true,
      data: slides,
    });
  } catch (error) {
    console.error("Error getting preview:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get preview" },
      { status: 500 }
    );
  }
}
