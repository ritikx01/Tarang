import axios from "axios";
import { MarketData } from "./fetchSymbolList";
import logger from "../utils/logger";

const KLINE_URL = "https://fapi.binance.com/fapi/v1/klines";

interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
  ignore: string;
}

interface KLineData {
  time: number;
  symbol: string;
  data: string[];
}

type KlineDataPoint = [
  number, // Open time
  string, // Open price
  string, // High price
  string, // Low price
  string, // Close price
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string, // Ignore
];

// Interface for the array of Klines
type Klines = Kline[];

async function fetchKlineData(symbols: string[], interval = "5m", limit = 288) {
  try {
    logger.info(
      `Fetching kline data for ${symbols.length}. Interval: ${interval} and Limit: ${limit}`,
    );
    const requests = symbols.map((symbol) =>
      axios.get<KlineDataPoint[]>(KLINE_URL, {
        params: { symbol, interval, limit: limit + 1 },
      }),
    );
    const responses = await Promise.all(requests);
    const time = responses[0].data.at(-1)?.[0];
    if (!time) {
      throw new Error("Invalid timestamp in response data");
    }
    const data = responses.map((response, index) => {
      response.data.pop();
      return {
        symbol: symbols[index],
        volumes: response.data.map((item) => Number(item[5])),
        closing: response.data.map((item) => Number(item[4])),
      };
    });

    logger.info(
      `Fetched data successfully for ${symbols.length} symbols at timestamp ${time}`,
    );

    return { time, data };
  } catch (error) {
    logger.error("Error fetching Kline data:\n", error);
    throw error;
  }
}

export default fetchKlineData;
