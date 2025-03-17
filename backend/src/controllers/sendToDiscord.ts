import { DiscordSignal } from "../services/symbolTracker";
export function sendToDiscord(data: DiscordSignal[]) {
  // console.log("For discord", symbol, price, strength);
  fetch(
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
}
