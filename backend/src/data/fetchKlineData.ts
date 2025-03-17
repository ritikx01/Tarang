import axios from "axios";
import { MarketData } from "./fetchSymbolList";

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
  number,  // Open time
  string,  // Open price
  string,  // High price
  string,  // Low price
  string,  // Close price
  string,  // Volume
  number,  // Close time
  string,  // Quote asset volume
  number,  // Number of trades
  string,  // Taker buy base asset volume
  string,  // Taker buy quote asset volume
  string   // Ignore
];

// Interface for the array of Klines
type Klines = Kline[];

async function fetchKlineData(symbols: string[], interval = "5m", limit = 288) {
  try {
    const requests = symbols.map((symbol) =>
      axios.get<KlineDataPoint[]>(KLINE_URL, {
        params: { symbol, interval, limit: limit + 1 },
      }),
    );
    const responses = await Promise.all(requests);
    const time = responses[0].data.at(-1)?.[0];
    if (!time) {
      throw new Error('Invalid timestamp in response data');
    }
    const data = responses.map((response, index) => {
      response.data.pop();
      return {
        symbol: symbols[index],
        volumes: response.data.map((item) => Number(item[5])),
        closing: response.data.map((item) => Number(item[4])),
      };
    });
    return { time, data };
  }
  catch (error) {
    console.error("Error fetching Kline data:", error);
    throw error;
  }
}

export default fetchKlineData;
