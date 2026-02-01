import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processUpload, isAllowedMimeType } from "@/lib/upload";
import { generateClaudeMd } from "@/lib/claude-md/generator";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/assets - List all assets for a project
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

    const assets = await prisma.asset.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    console.error("Error listing assets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list assets" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/assets - Upload new asset
export async function POST(
  request: NextRequest,
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

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { success: false, error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 50MB)" },
        { status: 400 }
      );
    }

    // Process the upload
    const uploadResult = await processUpload(id, file);

    // Save to database
    const asset = await prisma.asset.create({
      data: {
        projectId: id,
        filename: uploadResult.filename,
        storedFilename: uploadResult.storedFilename,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        category: uploadResult.category,
        path: uploadResult.path,
        thumbnail: uploadResult.thumbnail,
        metadata: uploadResult.metadata
          ? JSON.stringify(uploadResult.metadata)
          : null,
      },
    });

    // Regenerate CLAUDE.md with updated assets list
    const allAssets = await prisma.asset.findMany({
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
      assets: allAssets,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          asset,
          thumbnailGenerated: !!uploadResult.thumbnail,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading asset:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload asset" },
      { status: 500 }
    );
  }
}
