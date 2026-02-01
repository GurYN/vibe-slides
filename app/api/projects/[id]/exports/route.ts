import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/exports - List all exports for a project
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

    const exports = await prisma.export.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: exports,
    });
  } catch (error) {
    console.error("Error listing exports:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list exports" },
      { status: 500 }
    );
  }
}
