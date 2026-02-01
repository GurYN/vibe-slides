import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createProjectDirectory } from "@/lib/project-fs";
import { generateClaudeMd } from "@/lib/claude-md/generator";
import type { CreateProjectRequest } from "@/types/api";

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        template: true,
        _count: {
          select: {
            assets: true,
            exports: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Error listing projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list projects",
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json();

    if (!body.name || body.name.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Project name is required",
        },
        { status: 400 }
      );
    }

    // Create the project in the database first to get the ID
    const project = await prisma.project.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        aspectRatio: body.aspectRatio || "16:9",
        templateId: body.templateId || null,
        folderPath: "", // Will be updated after creating directory
      },
    });

    // Create the project directory structure
    const folderPath = await createProjectDirectory(project.id);

    // Update the project with the folder path
    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: { folderPath },
      include: { template: true },
    });

    // Generate initial CLAUDE.md
    await generateClaudeMd({
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        aspectRatio: updatedProject.aspectRatio,
        templateId: updatedProject.templateId,
      },
      assets: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedProject,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create project",
      },
      { status: 500 }
    );
  }
}
