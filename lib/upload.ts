import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { getProjectSubPath, getAssetSubDir, isPathWithinProject } from "./project-fs";
import type { AssetCategory, AssetMetadata } from "@/types/project";

const THUMBNAIL_SIZE = 200;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const ALLOWED_FONT_TYPES = [
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/x-font-ttf",
  "application/x-font-opentype",
];
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
];

export interface UploadResult {
  filename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  category: AssetCategory;
  path: string;
  thumbnail: string | null;
  metadata: AssetMetadata | null;
}

export function getCategoryFromMimeType(mimeType: string): AssetCategory {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return "images";
  }
  if (ALLOWED_FONT_TYPES.includes(mimeType)) {
    return "fonts";
  }
  return "references";
}

export function isAllowedMimeType(mimeType: string): boolean {
  return (
    ALLOWED_IMAGE_TYPES.includes(mimeType) ||
    ALLOWED_FONT_TYPES.includes(mimeType) ||
    ALLOWED_DOCUMENT_TYPES.includes(mimeType)
  );
}

export async function processUpload(
  projectId: string,
  file: File
): Promise<UploadResult> {
  const mimeType = file.type;
  const originalFilename = file.name;
  const category = getCategoryFromMimeType(mimeType);
  const subDir = getAssetSubDir(mimeType);

  // Keep original filename (sanitized)
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedFilename = sanitizedFilename;

  // Get the destination directory
  const destDir = getProjectSubPath(projectId, subDir);

  // Ensure directory exists
  if (!existsSync(destDir)) {
    await mkdir(destDir, { recursive: true });
  }

  const destPath = path.join(destDir, storedFilename);

  // Validate path is within project
  if (!isPathWithinProject(projectId, destPath)) {
    throw new Error("Invalid file path");
  }

  // Write the file
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, buffer);

  // Generate relative path for database
  const relativePath = `assets/${subDir === "images" ? "images" : subDir === "fonts" ? "fonts" : "references"}/${storedFilename}`;

  // Process image-specific operations
  let thumbnail: string | null = null;
  let metadata: AssetMetadata | null = null;

  if (ALLOWED_IMAGE_TYPES.includes(mimeType) && mimeType !== "image/svg+xml") {
    try {
      // Get image metadata
      const imageInfo = await sharp(buffer).metadata();
      metadata = {
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format,
        colorSpace: imageInfo.space,
      };

      // Generate thumbnail
      const thumbnailDir = getProjectSubPath(projectId, "thumbnails");
      if (!existsSync(thumbnailDir)) {
        await mkdir(thumbnailDir, { recursive: true });
      }

      const ext = path.extname(storedFilename);
      const thumbnailFilename = `thumb_${storedFilename.replace(ext, ".webp")}`;
      const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

      await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      thumbnail = `output/thumbnails/${thumbnailFilename}`;
    } catch (error) {
      console.error("Error processing image:", error);
      // Continue without thumbnail if processing fails
    }
  }

  return {
    filename: originalFilename,
    storedFilename,
    mimeType,
    size: buffer.length,
    category,
    path: relativePath,
    thumbnail,
    metadata,
  };
}
