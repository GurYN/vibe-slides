import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteProjectDirectory, getProjectClaudeMdPath } from "@/lib/project-fs";
import { writeFile } from "fs/promises";
import type { UpdateProjectRequest } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id] - Get a single project with relations
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        template: true,
        assets: {
          orderBy: { createdAt: "desc" },
        },
        exports: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch project",
      },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body: UpdateProjectRequest = await request.json();

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Partial<UpdateProjectRequest> = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.aspectRatio !== undefined) {
      updateData.aspectRatio = body.aspectRatio;
    }
    if (body.templateId !== undefined) {
      updateData.templateId = body.templateId;
    }
    if (body.claudeMdContent !== undefined) {
      updateData.claudeMdContent = body.claudeMdContent;
      // Also write to the file system if content is not null
      if (body.claudeMdContent !== null) {
        const claudeMdPath = getProjectClaudeMdPath(id);
        await writeFile(claudeMdPath, body.claudeMdContent);
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: { template: true },
    });

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update project",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
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
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    // Delete the project directory
    await deleteProjectDirectory(id);

    // Delete from database (cascades to assets, exports, sessions)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete project",
      },
      { status: 500 }
    );
  }
}
