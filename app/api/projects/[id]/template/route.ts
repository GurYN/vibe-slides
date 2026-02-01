import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateClaudeMd } from "@/lib/claude-md/generator";
import type { ApplyTemplateRequest } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/template - Apply a template to a project
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body: ApplyTemplateRequest = await request.json();

    if (!body.templateId) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Update project with new template
    const updatedProject = await prisma.project.update({
      where: { id },
      data: { templateId: body.templateId },
      include: { template: true },
    });

    // Regenerate CLAUDE.md with new template
    const claudeMdContent = await generateClaudeMd({
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        aspectRatio: updatedProject.aspectRatio,
        templateId: updatedProject.templateId,
      },
      assets: project.assets,
    });

    // Save the generated content to the database
    await prisma.project.update({
      where: { id },
      data: { claudeMdContent },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedProject,
        claudeMdContent,
      },
    });
  } catch (error) {
    console.error("Error applying template:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to apply template: ${errorMessage}` },
      { status: 500 }
    );
  }
}
