import { mkdir, rm, readdir, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// Base directory for all projects (configurable via environment variable)
export const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.cwd(), "projects");

/**
 * Project directory structure
 */
export const PROJECT_DIRS = {
  assets: "assets",
  images: "assets/images",
  fonts: "assets/fonts",
  references: "assets/references",
  templates: "templates",
  output: "output",
  thumbnails: "output/thumbnails",
  scripts: "scripts",
} as const;

/**
 * Ensure the projects root directory exists
 */
export async function ensureProjectsRoot(): Promise<void> {
  if (!existsSync(PROJECTS_ROOT)) {
    await mkdir(PROJECTS_ROOT, { recursive: true });
  }
}

/**
 * Create a new project directory with all subdirectories
 */
export async function createProjectDirectory(projectId: string): Promise<string> {
  await ensureProjectsRoot();

  const projectPath = path.join(PROJECTS_ROOT, projectId);

  // Create main project directory
  await mkdir(projectPath, { recursive: true });

  // Create all subdirectories
  for (const dir of Object.values(PROJECT_DIRS)) {
    await mkdir(path.join(projectPath, dir), { recursive: true });
  }

  // Create initial CLAUDE.md file
  const claudeMdPath = path.join(projectPath, "CLAUDE.md");
  const { writeFile } = await import("fs/promises");
  await writeFile(
    claudeMdPath,
    `# Project Configuration

This file will be automatically updated with project settings, template information, and asset references.

## Assets

No assets uploaded yet.

## Template

No template selected.

## Generation Instructions

Use this section to provide specific instructions for presentation generation.
`
  );

  return projectPath;
}

/**
 * Delete a project directory and all its contents
 */
export async function deleteProjectDirectory(projectId: string): Promise<void> {
  const projectPath = path.join(PROJECTS_ROOT, projectId);

  if (existsSync(projectPath)) {
    await rm(projectPath, { recursive: true, force: true });
  }
}

/**
 * Get the full path to a project directory
 */
export function getProjectPath(projectId: string): string {
  return path.join(PROJECTS_ROOT, projectId);
}

/**
 * Get the path to a specific subdirectory within a project
 */
export function getProjectSubPath(
  projectId: string,
  subDir: keyof typeof PROJECT_DIRS
): string {
  return path.join(PROJECTS_ROOT, projectId, PROJECT_DIRS[subDir]);
}

/**
 * Get the path to the project's CLAUDE.md file
 */
export function getProjectClaudeMdPath(projectId: string): string {
  return path.join(PROJECTS_ROOT, projectId, "CLAUDE.md");
}

/**
 * Check if a project directory exists
 */
export function projectExists(projectId: string): boolean {
  return existsSync(path.join(PROJECTS_ROOT, projectId));
}

/**
 * List all files in a project subdirectory
 */
export async function listProjectFiles(
  projectId: string,
  subDir: keyof typeof PROJECT_DIRS
): Promise<string[]> {
  const dirPath = getProjectSubPath(projectId, subDir);

  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => e.name);
}

/**
 * Get file stats for a project file
 */
export async function getProjectFileStats(
  projectId: string,
  subDir: keyof typeof PROJECT_DIRS,
  filename: string
): Promise<{ size: number; mtime: Date } | null> {
  const filePath = path.join(getProjectSubPath(projectId, subDir), filename);

  if (!existsSync(filePath)) {
    return null;
  }

  const stats = await stat(filePath);
  return {
    size: stats.size,
    mtime: stats.mtime,
  };
}

/**
 * Validate that a path is within the project directory (security)
 */
export function isPathWithinProject(
  projectId: string,
  targetPath: string
): boolean {
  const projectPath = getProjectPath(projectId);
  const resolvedTarget = path.resolve(targetPath);
  const resolvedProject = path.resolve(projectPath);

  return resolvedTarget.startsWith(resolvedProject + path.sep);
}

/**
 * Get category-specific subdirectory for asset type
 */
export function getAssetSubDir(
  mimeType: string
): keyof typeof PROJECT_DIRS {
  if (mimeType.startsWith("image/")) {
    return "images";
  }
  if (
    mimeType.includes("font") ||
    mimeType === "application/x-font-ttf" ||
    mimeType === "application/x-font-opentype"
  ) {
    return "fonts";
  }
  return "references";
}
