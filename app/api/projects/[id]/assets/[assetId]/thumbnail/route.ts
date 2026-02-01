import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getProjectPath } from "@/lib/project-fs";

type RouteParams = { params: Promise<{ id: string; assetId: string }> };

// GET /api/projects/[id]/assets/[assetId]/thumbnail - Get asset thumbnail
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, assetId } = await params;

    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        projectId: id,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    if (!asset.thumbnail) {
      return NextResponse.json(
        { success: false, error: "No thumbnail available" },
        { status: 404 }
      );
    }

    const projectPath = getProjectPath(id);
    const thumbnailPath = path.join(projectPath, asset.thumbnail);

    if (!existsSync(thumbnailPath)) {
      return NextResponse.json(
        { success: false, error: "Thumbnail file not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(thumbnailPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving thumbnail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to serve thumbnail" },
      { status: 500 }
    );
  }
}
