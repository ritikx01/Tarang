import WebSocket, { WebSocketServer } from "ws";
import logger from "../utils/logger";

export interface BroadcastMessage {
  symbol: string;
  signalType: boolean;
  price: number; // Closing Price
  timestamp: number;
  timeframe: string;
  chartLink?: string;
  exchangeLink: string;
  seen: boolean;
  strength: number;
}

class Broadcast {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket>;

  constructor(port = 8765) {
    this.wss = new WebSocketServer({ port });
    this.clients = new Set();

    this.wss.on("connection", (client) => {
      this.clients.add(client);
      logger.info("New WebSocket client connected");

      client.on("close", () => {
        this.clients.delete(client);
        logger.info("WebSocket server closed");
      });

      client.on("error", (error) => {
        logger.warn("WebSocket error:", { error });
      });
    });
    logger.info(`WebSocket server started on port ${port}`);
  }

  public broadcast(message: BroadcastMessage): void {
    const messageString = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
        } catch (error) {
          logger.error("Error broadcasting message to client:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }
    });
  }
}

export default Broadcast;
