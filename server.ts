import { createServer, type IncomingMessage } from "http";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import type { Duplex } from "stream";
import { ptyManager } from "./lib/pty/manager";
import { isValidProjectId, isValidSessionId } from "./lib/pty/security";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

interface WSClient {
  ws: WebSocket;
  sessionId: string | null;
  projectId: string | null;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Create WebSocket server without a server (noServer mode)
  const wss = new WebSocketServer({ noServer: true });

  // Track connected clients
  const clients = new Map<WebSocket, WSClient>();

  // Helper to send message to a WebSocket client
  function sendMessage(ws: WebSocket, message: object) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function sendError(ws: WebSocket, message: string) {
    sendMessage(ws, { type: "session:error", message });
  }

  // Set up PTY output handler ONCE at server startup (vibe-motion pattern)
  // This prevents listener stacking on React double-mount reconnects
  ptyManager.on("session:output", (sessionId: string, data: string) => {
    // Find all clients connected to this session and send output
    for (const [ws, client] of clients) {
      if (client.sessionId === sessionId) {
        sendMessage(ws, { type: "terminal:output", data });
      }
    }
  });

  ptyManager.on("session:exit", (sessionId: string, exitCode: number) => {
    // Find all clients connected to this session and notify them
    for (const [ws, client] of clients) {
      if (client.sessionId === sessionId) {
        sendMessage(ws, { type: "session:exit", exitCode });
      }
    }
  });

  // Handle WebSocket connections
  wss.on("connection", (ws: WebSocket) => {
    const client: WSClient = {
      ws,
      sessionId: null,
      projectId: null,
    };
    clients.set(ws, client);

    console.log("[WS] Client connected");

    ws.on("message", (rawMessage: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(rawMessage.toString());
        handleMessage(client, message);
      } catch (error) {
        console.error("[WS] Error parsing message:", error);
        sendError(ws, "Invalid message format");
      }
    });

    ws.on("close", () => {
      console.log("[WS] Client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("[WS] WebSocket error:", error);
    });
  });

  function handleMessage(client: WSClient, message: WSMessage) {
    const { ws } = client;

    switch (message.type) {
      case "session:connect": {
        const projectId = message.projectId as string;

        if (!projectId || !isValidProjectId(projectId)) {
          sendError(ws, "Invalid project ID");
          return;
        }

        try {
          // Check for existing session for this project
          let session = ptyManager.findSessionByProject(projectId);

          if (!session) {
            // Create a new PTY session only if none exists
            session = ptyManager.createSession(
              projectId,
              (message.cols as number) || 80,
              (message.rows as number) || 24
            );
            console.log(`[WS] New session created for project ${projectId}: ${session.id}`);
          } else {
            console.log(`[WS] Reusing existing session for project ${projectId}: ${session.id}`);
          }

          client.sessionId = session.id;
          client.projectId = projectId;

          // Send session connected message with output buffer for reconnection
          sendMessage(ws, {
            type: "session:connected",
            sessionId: session.id,
            outputBuffer: session.outputBuffer,
          });
        } catch (error) {
          console.error("[WS] Error creating session:", error);
          sendError(
            ws,
            error instanceof Error ? error.message : "Failed to create session"
          );
        }
        break;
      }

      case "terminal:input": {
        if (!client.sessionId) {
          sendError(ws, "No active session");
          return;
        }

        const data = message.data as string;
        if (typeof data !== "string") {
          sendError(ws, "Invalid input data");
          return;
        }

        ptyManager.write(client.sessionId, data);
        break;
      }

      case "terminal:resize": {
        if (!client.sessionId) {
          sendError(ws, "No active session");
          return;
        }

        const cols = message.cols as number;
        const rows = message.rows as number;

        if (typeof cols !== "number" || typeof rows !== "number") {
          sendError(ws, "Invalid resize dimensions");
          return;
        }

        ptyManager.resize(client.sessionId, cols, rows);
        break;
      }

      case "session:disconnect": {
        if (client.sessionId) {
          ptyManager.killSession(client.sessionId);
          client.sessionId = null;
          client.projectId = null;
        }
        break;
      }

      default:
        sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  // Handle HTTP upgrade requests for WebSocket
  // Only intercept /api/ws - let Next.js handle all other WebSocket upgrades (like webpack-hmr)
  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url || "", `http://${hostname}:${port}`);

    if (pathname === "/api/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
    // Don't destroy other sockets - let Next.js handle them (webpack-hmr, etc.)
  });

  // Periodic cleanup of inactive sessions
  setInterval(() => {
    const cleaned = ptyManager.cleanupInactiveSessions();
    if (cleaned > 0) {
      console.log(`[PTY] Cleaned up ${cleaned} inactive sessions`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
