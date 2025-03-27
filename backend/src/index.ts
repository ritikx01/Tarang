import Broadcast from "./services/broadcast";
import MarketDataManager from "./services/MarketDataManager";

export const broadcast = new Broadcast();
export const marketDataManager = new MarketDataManager();
marketDataManager.initializeMarketDataManager();
