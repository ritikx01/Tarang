import Broadcast from "./services/broadcast";
import MarketDataManager from "./services/MarketDataManager";
import { PrismaClient } from "@prisma/client";
import SignalManager from "./services/signalManager";
import staleSignalEvaluator from "./services/staleSignalEvaluator";

export const prisma = new PrismaClient();
staleSignalEvaluator();
export const broadcast = new Broadcast();
export const signalManager = new SignalManager();
export const marketDataManager = new MarketDataManager();

marketDataManager.initializeMarketDataManager();
