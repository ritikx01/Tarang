import axios from "axios";

interface MarketData {
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
    const response = await axios.get(TICKER_URL);
    const symbols = response.data
      .filter((item) => !item.symbol.toLowerCase().endsWith("usdc"))
      .map((item: MarketData) => item.symbol.toLowerCase());
    return symbols;
  } catch (error) {
    console.error("Error fetching symbols:", error);
    return [];
  }
}

export default fetchSymbolList;
