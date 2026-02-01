import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getProjectSubPath } from "@/lib/project-fs";

type RouteParams = { params: Promise<{ id: string; filename: string }> };

// GET /api/projects/[id]/preview/[filename] - Serve a slide thumbnail image
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, filename } = await params;

    // Validate filename (security: prevent path traversal)
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json(
        { success: false, error: "Invalid filename" },
        { status: 400 }
      );
    }

    // Only allow image files
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 }
      );
    }

    const thumbnailsDir = getProjectSubPath(id, "thumbnails");
    const filePath = path.join(thumbnailsDir, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
