import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { builtInTemplates } from "@/data/templates";

// GET /api/templates - List all templates (built-in + custom)
export async function GET() {
  try {
    // Get custom templates from database
    const customTemplates = await prisma.template.findMany({
      where: { isBuiltIn: false },
      orderBy: { name: "asc" },
    });

    // Combine built-in and custom templates
    const allTemplates = [
      ...builtInTemplates.map((t) => ({
        ...t,
        createdAt: new Date(),
        updatedAt: new Date(),
        designSystem: JSON.stringify(t.designSystem),
      })),
      ...customTemplates,
    ];

    return NextResponse.json({
      success: true,
      data: allTemplates,
    });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list templates" },
      { status: 500 }
    );
  }
}
