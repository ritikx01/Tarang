import logger from "../utils/logger";

export interface DiscordSignal {
  symbol: string;
  price: number;
  inline: boolean;
}

class SendToDiscord {
  private signalQueue: DiscordSignal[] = [];
  private isSending: boolean = false;

  constructor() {
    this.startAutoFlush();
  }

  private startAutoFlush() {
    setInterval(async () => {
      if (this.signalQueue.length > 0 && !this.isSending) {
        this.isSending = true;
        await this.flushQueuedSignals();
        this.isSending = false;
      }
    }, 5000);
  }

  public queueSignal(signal: DiscordSignal) {
    this.signalQueue.push(signal);
  }

  private async flushQueuedSignals() {
    try {
      const signalsToSend = [...this.signalQueue];
      this.signalQueue = [];
      const response = await fetch(
        "https://discord.com/api/webhooks/1314246854812237877/OzATs32y-EAYGwZ0N6fRDGfFWT3SNA-qLPbXB7H_L8r8ZESHQBYbEjMEOAFvMUvs9q8N",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "Trade signal",
            embeds: [
              {
                title: "Buy Signal",
                description: "Long position",
                color: 65436,
                fields: signalsToSend,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Discord API responded with status ${response.status}`);
      }

      logger.info("Successfully sent signal to Discord");
    } catch (error) {
      logger.error("Error sending signal to Discord", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
const sendToDiscord = new SendToDiscord();
export default sendToDiscord;
