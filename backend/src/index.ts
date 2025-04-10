import Broadcast from "./services/broadcast";
import MarketDataManager from "./services/MarketDataManager";
import { PrismaClient } from "@prisma/client";
import SignalManager from "./services/signalManager";
import staleSignalEvaluator from "./services/staleSignalEvaluator";
import logger from "./utils/logger";
import checkDBConnection from "./utils/checkDBconnection";

export const prisma = new PrismaClient();
export let broadcast: Broadcast;
export let signalManager: SignalManager;
export let marketDataManager: MarketDataManager;

function startPeriodicStaleSignalEvaluator() {
  staleSignalEvaluator();
  setInterval(
    () => {
      staleSignalEvaluator();
    },
    60 * 60 * 48 * 1000,
  );
}

export async function main() {
  await checkDBConnection();
  startPeriodicStaleSignalEvaluator();
  broadcast = new Broadcast();
  signalManager = new SignalManager();
  marketDataManager = new MarketDataManager();
  marketDataManager.initializeMarketDataManager();
}

main().catch((error) => {
  logger.error(`Startup failed, Error:`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
});
