import { EventEmitter } from "events";
import * as pty from "node-pty";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";
import {
  getSafeWorkingDirectory,
  getSafeEnvironment,
  sanitizeInput,
  truncateOutputBuffer,
  MAX_OUTPUT_BUFFER_SIZE,
} from "./security";

// Find claude executable path
function getClaudePath(): string {
  // Check common installation paths
  const paths = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    `${process.env.HOME}/.local/bin/claude`,
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Fall back to just "claude" and hope it's in PATH
  return "claude";
}

export interface PTYSession {
  id: string;
  projectId: string;
  ptyProcess: pty.IPty;
  outputBuffer: string;
  cols: number;
  rows: number;
  createdAt: Date;
  lastActiveAt: Date;
}

interface PTYManagerEvents {
  "session:output": (sessionId: string, data: string) => void;
  "session:exit": (sessionId: string, exitCode: number) => void;
  "session:error": (sessionId: string, error: Error) => void;
}

export class PTYManager extends EventEmitter {
  private sessions: Map<string, PTYSession> = new Map();
  private static instance: PTYManager | null = null;

  private constructor() {
    super();
  }

  static getInstance(): PTYManager {
    if (!PTYManager.instance) {
      PTYManager.instance = new PTYManager();
    }
    return PTYManager.instance;
  }

  /**
   * Create a new PTY session for a project
   */
  createSession(
    projectId: string,
    cols: number = 80,
    rows: number = 24
  ): PTYSession {
    const sessionId = uuidv4();
    const cwd = getSafeWorkingDirectory(projectId);
    const env = getSafeEnvironment(projectId);

    // Filter out undefined values from env
    const filteredEnv: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        filteredEnv[key] = value;
      }
    }

    // Get the claude executable path
    const claudeExecutable = getClaudePath();
    console.log("[PTY] Spawning claude from:", claudeExecutable);
    console.log("[PTY] Working directory:", cwd);
    console.log("[PTY] PATH:", filteredEnv.PATH?.substring(0, 100) + "...");

    // Spawn the PTY process with Claude Code
    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(claudeExecutable, ["--dangerously-skip-permissions"], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: filteredEnv,
        encoding: "utf8",
      });
    } catch (spawnError) {
      console.error("[PTY] Spawn failed:", spawnError);
      console.error("[PTY] Trying with /bin/bash as shell...");

      // Fallback: try spawning bash that runs claude
      ptyProcess = pty.spawn("/bin/bash", ["-l", "-c", `${claudeExecutable} --dangerously-skip-permissions`], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: filteredEnv,
        encoding: "utf8",
      });
    }

    const session: PTYSession = {
      id: sessionId,
      projectId,
      ptyProcess,
      outputBuffer: "",
      cols,
      rows,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    // Handle output from the PTY
    ptyProcess.onData((data) => {
      session.outputBuffer = truncateOutputBuffer(session.outputBuffer + data);
      session.lastActiveAt = new Date();
      this.emit("session:output", sessionId, data);
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      this.emit("session:exit", sessionId, exitCode);
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get an existing session by ID
   */
  getSession(sessionId: string): PTYSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a project
   */
  getSessionsForProject(projectId: string): PTYSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.projectId === projectId
    );
  }

  /**
   * Find an existing session for a project (returns first match)
   */
  findSessionByProject(projectId: string): PTYSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Write data to a session
   */
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const sanitizedData = sanitizeInput(data);
    session.ptyProcess.write(sanitizedData);
    session.lastActiveAt = new Date();
    return true;
  }

  /**
   * Resize a session's terminal
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.ptyProcess.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
    session.lastActiveAt = new Date();
    return true;
  }

  /**
   * Kill a session
   */
  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.ptyProcess.kill();
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Kill all sessions for a project
   */
  killProjectSessions(projectId: string): number {
    const sessions = this.getSessionsForProject(projectId);
    let killed = 0;

    for (const session of sessions) {
      if (this.killSession(session.id)) {
        killed++;
      }
    }

    return killed;
  }

  /**
   * Get the output buffer for a session
   */
  getOutputBuffer(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    return session?.outputBuffer ?? null;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up inactive sessions (older than maxAge milliseconds)
   */
  cleanupInactiveSessions(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      const age = now.getTime() - session.lastActiveAt.getTime();
      if (age > maxAgeMs) {
        this.killSession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Type-safe event emitter methods
  on<K extends keyof PTYManagerEvents>(
    event: K,
    listener: PTYManagerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof PTYManagerEvents>(
    event: K,
    ...args: Parameters<PTYManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

export const ptyManager = PTYManager.getInstance();
