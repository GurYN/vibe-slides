import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getProjectPath } from "@/lib/project-fs";
import { generateClaudeMd } from "@/lib/claude-md/generator";

type RouteParams = { params: Promise<{ id: string; assetId: string }> };

// GET /api/projects/[id]/assets/[assetId] - Get asset file or thumbnail
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, assetId } = await params;
    const { searchParams } = new URL(request.url);
    const isThumbnail = searchParams.get("thumbnail") === "true" ||
                        request.nextUrl.pathname.endsWith("/thumbnail");

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

    const projectPath = getProjectPath(id);
    let filePath: string;
    let contentType: string;

    if (isThumbnail && asset.thumbnail) {
      filePath = path.join(projectPath, asset.thumbnail);
      contentType = "image/webp";
    } else {
      filePath = path.join(projectPath, asset.path);
      contentType = asset.mimeType;
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving asset:", error);
    return NextResponse.json(
      { success: false, error: "Failed to serve asset" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/assets/[assetId] - Delete an asset
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, assetId } = await params;

    // Check if asset exists and belongs to the project
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

    const projectPath = getProjectPath(id);

    // Delete the main file
    const mainFilePath = path.join(projectPath, asset.path);
    if (existsSync(mainFilePath)) {
      await unlink(mainFilePath);
    }

    // Delete the thumbnail if it exists
    if (asset.thumbnail) {
      const thumbnailPath = path.join(projectPath, asset.thumbnail);
      if (existsSync(thumbnailPath)) {
        await unlink(thumbnailPath);
      }
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id: assetId },
    });

    // Regenerate CLAUDE.md with updated assets list
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (project) {
      const remainingAssets = await prisma.asset.findMany({
        where: { projectId: id },
      });
      await generateClaudeMd({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          aspectRatio: project.aspectRatio,
          templateId: project.templateId,
        },
        assets: remainingAssets,
      });
    }

    return NextResponse.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
