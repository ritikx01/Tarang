import { DiscordSignal } from "../services/symbolTracker";
import logger from "../utils/logger";

export async function sendToDiscord(data: DiscordSignal[]) {
  // console.log("For discord", symbol, price, strength);
  try {
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
              fields: data,
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
