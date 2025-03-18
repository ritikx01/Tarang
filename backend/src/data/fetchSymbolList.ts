import axios from "axios";
import logger from "../utils/logger";

export interface MarketData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

async function fetchSymbolList(): Promise<string[]> {
  const TICKER_URL = "https://fapi.binance.com/fapi/v1/ticker/24hr";
  try {
    const response = await axios.get<MarketData[]>(TICKER_URL);

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const symbols = response.data
      .filter((item) => !item.symbol.toLowerCase().endsWith("usdc"))
      .map((item: MarketData) => item.symbol.toLowerCase());

    logger.info("Successfully fetched symbol list from binance");
    return symbols;
  } catch (error) {
    logger.error("Error fetching symbols:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
    return [];
  }
}

export default fetchSymbolList;
