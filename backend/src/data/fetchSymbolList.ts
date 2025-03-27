import axios from "axios";
import logger from "../utils/logger"; // Make sure you have your logger configured

interface ExchangeInfoResponse {
  symbols: {
    symbol: string;
    pair: string;
    contractType: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    filters: {
      filterType: string;
      [key: string]: string | number;
    }[];
  }[];
}

async function fetchSymbolList(): Promise<string[]> {
  const EXCHANGE_INFO_URL = "https://fapi.binance.com/fapi/v1/exchangeInfo";

  try {
    const response = await axios.get<ExchangeInfoResponse>(EXCHANGE_INFO_URL);

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    // Filter active trading pairs ending with USDT
    const usdtPairs = response.data.symbols
      .filter(
        (symbol) =>
          symbol.quoteAsset === "USDT" &&
          symbol.status === "TRADING" &&
          symbol.contractType === "PERPETUAL"
      )
      .map((symbol) => symbol.symbol.toLowerCase());

    logger.info(
      `Successfully fetched ${
        usdtPairs.length
      } active USDT trading pairs from Binance. First five pairs: ${usdtPairs.slice(
        0,
        5
      )}`
    );

    return usdtPairs;
  } catch (error) {
    logger.error("Error fetching active USDT trading pairs:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: EXCHANGE_INFO_URL,
    });
    throw error;
  }
}

export default fetchSymbolList;
