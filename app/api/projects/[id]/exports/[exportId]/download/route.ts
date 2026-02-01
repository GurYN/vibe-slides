import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getProjectPath } from "@/lib/project-fs";

type RouteParams = { params: Promise<{ id: string; exportId: string }> };

// GET /api/projects/[id]/exports/[exportId]/download - Download an export
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, exportId } = await params;

    // Get the export record
    const exportRecord = await prisma.export.findFirst({
      where: {
        id: exportId,
        projectId: id,
      },
    });

    if (!exportRecord) {
      return NextResponse.json(
        { success: false, error: "Export not found" },
        { status: 404 }
      );
    }

    if (exportRecord.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Export not ready for download" },
        { status: 400 }
      );
    }

    // Get the file path
    const projectPath = getProjectPath(id);
    const filePath = path.join(projectPath, exportRecord.outputPath);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "Export file not found" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Get the filename
    const filename = path.basename(exportRecord.outputPath);

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading export:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download export" },
      { status: 500 }
    );
  }
}
