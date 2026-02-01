import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTemplateById } from "@/data/templates";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/templates/[id] - Get a single template
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check built-in templates first
    const builtInTemplate = getTemplateById(id);
    if (builtInTemplate) {
      return NextResponse.json({
        success: true,
        data: {
          ...builtInTemplate,
          createdAt: new Date(),
          updatedAt: new Date(),
          designSystem: JSON.stringify(builtInTemplate.designSystem),
        },
      });
    }

    // Check custom templates in database
    const customTemplate = await prisma.template.findUnique({
      where: { id },
    });

    if (!customTemplate) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customTemplate,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
