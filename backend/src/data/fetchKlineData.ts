import axios from "axios";
import logger from "../utils/logger";

const KLINE_URL = "https://fapi.binance.com/fapi/v1/klines";

export interface Kline {
  openingTimestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
}

interface KLineData {
  time: number;
  symbol: string;
  data: string[];
}

export type KlineDataPoint = [
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
  string // Ignore
];

interface KlineDataExtracted {
  openingTimestamps: number[];
  openPrices: number[];
  highPrices: number[];
  lowPrices: number[];
  closePrices: number[];
  volumes: number[];
  closingTimestamps: number[];
}

// Interface for the array of Klines
const emptyKlineData: KlineDataExtracted = {
  openingTimestamps: [],
  openPrices: [],
  highPrices: [],
  lowPrices: [],
  closePrices: [],
  volumes: [],
  closingTimestamps: [],
};

async function fetchKlineData(
  symbol: string,
  interval = "5m",
  limit = 288
): Promise<KlineDataExtracted> {
  try {
    logger.info(
      `Fetching kline data for ${symbol}. Interval: ${interval} and Limit: ${limit}`
    );
    const response = await axios.get<KlineDataPoint[]>(KLINE_URL, {
      params: { symbol, interval, limit: limit + 1 },
    });
    const time = response.data.at(-1)?.[0];
    if (!time) {
      throw new Error("Invalid timestamp in response data");
    }
    const data: KlineDataExtracted = {
      openingTimestamps: [],
      openPrices: [],
      highPrices: [],
      lowPrices: [],
      closePrices: [],
      volumes: [],
      closingTimestamps: [],
    };

    response.data.forEach((klineData: KlineDataPoint) => {
      data.openingTimestamps.push(klineData[0]);
      data.openPrices.push(Number(klineData[1]));
      data.highPrices.push(Number(klineData[2]));
      data.lowPrices.push(Number(klineData[3]));
      data.closePrices.push(Number(klineData[4]));
      data.volumes.push(Number(klineData[5]));
      data.closingTimestamps.push(klineData[6]);
    });
    logger.info(
      `Fetched data successfully for ${symbol} symbols at timestamp ${time}. Data length: ${data.openingTimestamps.length}`
    );
    if (data.openingTimestamps.length !== limit + 1) {
      logger.error(
        `Expected ${limit + 1} data points but received ${
          data.openingTimestamps.length
        } for ${symbol}, discarding...`
      );
      return emptyKlineData;
    }
    return data;
  } catch (error) {
    logger.error("Error fetching Kline data:\n", error);
    throw error;
  }
}

export default fetchKlineData;
