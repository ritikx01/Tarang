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

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      logger.info("New WebSocket client connected");

      // Remove the client when it disconnects
      ws.on("close", () => {
        this.clients.delete(ws);
        logger.info("WebSocket client disconnected");
      });

      ws.on("error", (error) => {
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
          logger.error("Error sending WebSocket message", { error });
        }
      }
    });
    logger.verbose(`Broadcasted message: ${messageString}`);
  }

  public close(): void {
    this.wss.close();
    this.clients.forEach((client) => client.close());
    this.clients.clear();
    logger.info("WebSocket server closed");
  }
}

export default Broadcast;
