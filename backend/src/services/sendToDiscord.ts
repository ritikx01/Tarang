import logger from "../utils/logger";

const DISCORD_WEBHOOK_URL: string | undefined = process.env.DISCORD_WEBHOOK_URL;

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
    if (!DISCORD_WEBHOOK_URL) {
      logger.warn("Discord webhook URL is not set in environment variables.");
      return;
    }
    this.signalQueue.push(signal);
  }

  private async flushQueuedSignals() {
    try {
      const signalsToSend = [...this.signalQueue];
      this.signalQueue = [];
      const response = await fetch(DISCORD_WEBHOOK_URL as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Trade signal",
          embeds: [
            {
              title: "Buy Signal",
              description: "Long position",
              color: 65436,
              fields: signalsToSend.map((signal) => ({
                name: signal.symbol,
                value: `$${signal.price.toFixed(2)}`,
                inline: signal.inline,
              })),
            },
          ],
        }),
      });
      if (!response.ok) {
        // Add a retry mechanism, move queue clearing after successful send
        logger.error(`Discord API responded with status ${response.status}`);
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
