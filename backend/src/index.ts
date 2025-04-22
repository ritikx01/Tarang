import Broadcast from "./services/broadcast";
import MarketDataManager from "./services/MarketDataManager";
import { PrismaClient } from "@prisma/client";
import SignalManager from "./services/signalManager";
import staleSignalEvaluator from "./services/staleSignalEvaluator";
import logger from "./utils/logger";
import checkDBConnection from "./utils/checkDBconnection";
import dotenv from "dotenv";
import { createServer } from "./web/server";
import { setUser } from "./web/services/jwt";

export const prisma = new PrismaClient();
export let broadcast: Broadcast;
export let signalManager: SignalManager;
export let marketDataManager: MarketDataManager;

dotenv.config();
console.log(setUser("admin"));
async function startPeriodicStaleSignalEvaluator() {
  await staleSignalEvaluator();
  setInterval(async () => {
    try {
      staleSignalEvaluator();
    } catch (error) {
      console.error("Periodic evaluation failed:", error);
    }
  }, 60 * 60 * 48 * 1000);
  return;
}

export async function main() {
  await checkDBConnection();
  // Remove periodic run until fully fixed.
  // await startPeriodicStaleSignalEvaluator();
  await staleSignalEvaluator();
  broadcast = new Broadcast();
  signalManager = new SignalManager();
  marketDataManager = new MarketDataManager();
  marketDataManager.initializeMarketDataManager();

  const { app, PORT, HOSTNAME } = createServer();
  app.listen(PORT, HOSTNAME, () => {
    logger.info(`Server running on port: ${PORT}`);
  });
}

main().catch((error) => {
  logger.error(`Startup failed, Error:`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
});
