import path from "path";
import { existsSync } from "fs";
import { PROJECTS_ROOT } from "@/lib/project-fs";

/**
 * Get a safe working directory for a project
 * Ensures the path is within the projects root
 */
export function getSafeWorkingDirectory(projectId: string): string {
  const projectPath = path.join(PROJECTS_ROOT, projectId);

  // Verify the path is within projects root
  const resolvedPath = path.resolve(projectPath);
  const resolvedRoot = path.resolve(PROJECTS_ROOT);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid project path");
  }

  // Verify the directory exists
  if (!existsSync(resolvedPath)) {
    throw new Error("Project directory does not exist");
  }

  return resolvedPath;
}

/**
 * Get sanitized environment variables for the PTY process
 * Only includes safe variables needed for Claude Code to function
 */
export function getSafeEnvironment(projectId: string): Record<string, string | undefined> {
  const projectPath = getSafeWorkingDirectory(projectId);

  return {
    // Essential system paths
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    SHELL: process.env.SHELL || "/bin/bash",

    // Terminal settings
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    LANG: process.env.LANG || "en_US.UTF-8",

    // Claude Code specific settings
    CLAUDE_CODE_ALLOWED_PATHS: projectPath,

    // Node/Bun paths (for running scripts)
    NODE_PATH: process.env.NODE_PATH,
    BUN_INSTALL: process.env.BUN_INSTALL,

    // XDG paths
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
  };
}

/**
 * Validate that a session ID is properly formatted
 */
export function isValidSessionId(sessionId: string): boolean {
  // UUID v4 format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

/**
 * Validate project ID format
 */
export function isValidProjectId(projectId: string): boolean {
  // UUID v4 format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(projectId);
}

/**
 * Sanitize input data before sending to PTY
 * Removes potentially dangerous control sequences
 */
export function sanitizeInput(data: string): string {
  // Remove most ANSI escape sequences that could be dangerous
  // but allow normal cursor movement and colors
  return data
    // Remove screen manipulation escapes
    .replace(/\x1b\[\d*[JKsu]/g, "")
    // Remove title setting escapes
    .replace(/\x1b\][^\x07]*\x07/g, "");
}

/**
 * Maximum output buffer size (5000 characters as per plan)
 */
export const MAX_OUTPUT_BUFFER_SIZE = 5000;

/**
 * Truncate output buffer to maximum size
 */
export function truncateOutputBuffer(buffer: string): string {
  if (buffer.length > MAX_OUTPUT_BUFFER_SIZE) {
    return buffer.slice(-MAX_OUTPUT_BUFFER_SIZE);
  }
  return buffer;
}
