import WebSocket, { WebSocketServer } from "ws";

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
    });
  }

  public broadcast(message: BroadcastMessage): void {
    const messageString = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
}

export default Broadcast;
