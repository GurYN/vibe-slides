import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, unlinkSync, statSync, readdirSync, renameSync } from "fs";
import path from "path";
import { getProjectPath, getProjectSubPath } from "../project-fs";

const execAsync = promisify(exec);

// LibreOffice path on macOS
const LIBREOFFICE_PATH = "/Applications/LibreOffice.app/Contents/MacOS/soffice";

// Fallback paths for different systems
const SOFFICE_PATHS = [
  LIBREOFFICE_PATH,
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
  "/opt/libreoffice/program/soffice",
];

// pdftoppm paths (from poppler)
const PDFTOPPM_PATHS = [
  "/opt/homebrew/bin/pdftoppm",
  "/usr/local/bin/pdftoppm",
  "/usr/bin/pdftoppm",
];

function findSoffice(): string | null {
  for (const p of SOFFICE_PATHS) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
}

function findPdftoppm(): string | null {
  for (const p of PDFTOPPM_PATHS) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
}

export interface ThumbnailResult {
  success: boolean;
  slideCount: number;
  thumbnails: string[];
  error?: string;
}

/**
 * Generate thumbnails from a PPTX file
 * Uses LibreOffice to convert to PDF, then pdftoppm for high-quality image rendering
 */
export async function generateThumbnails(
  projectId: string,
  pptxFilename: string
): Promise<ThumbnailResult> {
  const soffice = findSoffice();
  if (!soffice) {
    return {
      success: false,
      slideCount: 0,
      thumbnails: [],
      error: "LibreOffice not found",
    };
  }

  const pdftoppm = findPdftoppm();
  if (!pdftoppm) {
    return {
      success: false,
      slideCount: 0,
      thumbnails: [],
      error: "pdftoppm not found (install poppler: brew install poppler)",
    };
  }

  const projectPath = getProjectPath(projectId);
  const pptxPath = path.join(projectPath, pptxFilename);
  const thumbnailsDir = getProjectSubPath(projectId, "thumbnails");

  // Ensure thumbnails directory exists
  if (!existsSync(thumbnailsDir)) {
    mkdirSync(thumbnailsDir, { recursive: true });
  }

  // Check if PPTX exists
  if (!existsSync(pptxPath)) {
    return {
      success: false,
      slideCount: 0,
      thumbnails: [],
      error: `PPTX file not found: ${pptxFilename}`,
    };
  }

  const tempDir = path.join(projectPath, ".temp");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Step 1: Convert PPTX to PDF using LibreOffice
    console.log(`[Thumbnail] Converting ${pptxFilename} to PDF...`);

    const pdfCmd = `"${soffice}" --headless --convert-to pdf --outdir "${tempDir}" "${pptxPath}"`;
    await execAsync(pdfCmd, { timeout: 120000 });

    const pdfFiles = readdirSync(tempDir).filter(f => f.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      return {
        success: false,
        slideCount: 0,
        thumbnails: [],
        error: "PDF conversion failed",
      };
    }

    const pdfPath = path.join(tempDir, pdfFiles[0]);

    // Step 2: Convert PDF to PNG using pdftoppm (poppler) for proper font rendering
    console.log(`[Thumbnail] Converting PDF to images with pdftoppm...`);

    const slidePrefix = path.join(tempDir, "slide");
    const ppmCmd = `"${pdftoppm}" -png -r 150 "${pdfPath}" "${slidePrefix}"`;
    await execAsync(ppmCmd, { timeout: 120000 });

    // Find generated images (pdftoppm creates slide-1.png, slide-2.png, etc.)
    const generatedFiles = readdirSync(tempDir)
      .filter(f => f.startsWith("slide-") && f.endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide-(\d+)\.png/)?.[1] || "0");
        const numB = parseInt(b.match(/slide-(\d+)\.png/)?.[1] || "0");
        return numA - numB;
      });

    if (generatedFiles.length === 0) {
      return {
        success: false,
        slideCount: 0,
        thumbnails: [],
        error: "No images generated from PDF",
      };
    }

    // Step 3: Move and rename files to thumbnails directory
    const thumbnails: string[] = [];
    for (const file of generatedFiles) {
      const match = file.match(/slide-(\d+)\.png/);
      if (match) {
        const slideNum = parseInt(match[1]);
        const thumbnailFilename = `slide_${slideNum}.png`;
        const srcPath = path.join(tempDir, file);
        const destPath = path.join(thumbnailsDir, thumbnailFilename);

        // Move file
        renameSync(srcPath, destPath);
        thumbnails.push(thumbnailFilename);
        console.log(`[Thumbnail] Generated ${thumbnailFilename}`);
      }
    }

    // Clean up temp files
    for (const f of readdirSync(tempDir)) {
      try { unlinkSync(path.join(tempDir, f)); } catch {}
    }

    console.log(`[Thumbnail] Generated ${thumbnails.length} thumbnails`);

    return {
      success: true,
      slideCount: thumbnails.length,
      thumbnails,
    };
  } catch (error) {
    console.error("[Thumbnail] Error generating thumbnails:", error);
    return {
      success: false,
      slideCount: 0,
      thumbnails: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if thumbnails need to be regenerated
 */
export function needsRegeneration(
  projectId: string,
  pptxFilename: string
): boolean {
  const projectPath = getProjectPath(projectId);
  const pptxPath = path.join(projectPath, pptxFilename);
  const thumbnailsDir = getProjectSubPath(projectId, "thumbnails");

  if (!existsSync(pptxPath)) {
    return false;
  }

  // Check if any thumbnails exist
  const slide1 = path.join(thumbnailsDir, "slide_1.png");
  if (!existsSync(slide1)) {
    return true;
  }

  // Compare modification times
  const pptxStat = statSync(pptxPath);
  const thumbStat = statSync(slide1);

  return pptxStat.mtime > thumbStat.mtime;
}
