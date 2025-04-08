import MedianTracker from "../trackers/medianTracker";
import logger from "../utils/logger";
import fetchKlineData from "../data/fetchKlineData";
import fetchSymbolList from "../data/fetchSymbolList";
import EMATracker from "../trackers/emaTracker";
import FetchKlineStream from "../data/fetchKlineStream";
import AlgoManager from "./algoManager";

interface CandleData {
  openingTimestamps: number[];
  openPrices: number[];
  highPrices: number[];
  lowPrices: number[];
  closePrices: number[];
  volumes: number[];
  closingTimestamps: number[];
  emaData: EMATracker;
  medianData: MedianTracker;
}
export interface AddCandleData {
  openingTimestamp: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  closingTimestamp: number;
}
const propertyMappings: [keyof CandleData & string, keyof AddCandleData][] = [
  ["openingTimestamps", "openingTimestamp"],
  ["openPrices", "openPrice"],
  ["highPrices", "highPrice"],
  ["lowPrices", "lowPrice"],
  ["closePrices", "closePrice"],
  ["volumes", "volume"],
  ["closingTimestamps", "closingTimestamp"],
];
interface TimeframeStore {
  [timeframe: string]: CandleData;
}
interface MarketDataStore {
  [symbol: string]: TimeframeStore;
}
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "D" | "W";

// Candles to process according to timelimit, adjused based on chart patterns
// (Price should be higher than average)
const timeframeCandleMapping: { [timeframe in Timeframe]?: number } = {
  // "1m": 100,
  // "5m": 288,
  "15m": 96,
};

class MarketDataManager {
  // Make marketData private and add getter
  public marketData: MarketDataStore = {};
  private fetchklineStream: FetchKlineStream;
  private algoManager: AlgoManager;

  constructor() {
    this.fetchklineStream = new FetchKlineStream();
    this.algoManager = new AlgoManager();
  }

  public async initializeMarketDataManager() {
    try {
      let symbols = await fetchSymbolList();
      const insufficientSymbols: string[] = [];
      const count = symbols.length;
      logger.info(
        `Successfully fetched symbol list containing ${count} symbols`
      );
      let counter = 0;

      for (const symbol of symbols) {
        counter++;
        logger.info(`Processing symbol ${symbol} (${counter}/${count})`);
        if (this.marketData[symbol]) {
          logger.info(`Skipping old symbol ${symbol}`);
          continue;
        }
        for (const [timeframe, limit] of Object.entries(
          timeframeCandleMapping
        )) {
          try {
            const fetchCandleCount = limit * 3;
            const klineData = await fetchKlineData(
              symbol,
              timeframe as Timeframe,
              fetchCandleCount
            );
            if (klineData.openingTimestamps.length === 0) {
              logger.warn(
                `No data returned for ${symbol} ${timeframe}. Skipping symbol.`
              );
              insufficientSymbols.push(symbol);
              continue;
            }
            logger.info(
              `Successfully fetched ${symbol} ${timeframe} data: ${klineData.closingTimestamps.length} candles`
            );
            const medianData = new MedianTracker(
              klineData.volumes.slice(-limit)
            );
            const emaData = new EMATracker(klineData.closePrices);
            if (!this.marketData[symbol]) {
              this.marketData[symbol] = {};
            }
            this.marketData[symbol][timeframe] = {
              ...klineData,
              emaData,
              medianData,
            };
            // To-do: Add a way to delay ws stream initialization until historical data is processed
            // Market data initialized, now start the websocket stream
          } catch (error) {
            logger.error(
              `Error processing symbol ${symbol} and timeframe ${timeframe}:`,
              {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              }
            );
          }
        }
      }
      symbols = symbols.filter((val) => !insufficientSymbols.includes(val));
      this.fetchklineStream.initWebsocket(
        symbols,
        Object.keys(timeframeCandleMapping) as Timeframe[]
      );
      logger.info("Market Data Manager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize market data manager", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  public cleanMarketDataManager() {
    try {
      this.initializeMarketDataManager();
      logger.info("Market Data Manager re-initialized successfully");
    } catch (error) {
      logger.error("Failed to re-initialize market data manager", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  public addCandleData(
    symbol: string,
    timeframe: Timeframe,
    candleData: AddCandleData
  ) {
    if (!this.marketData[symbol] || !this.marketData[symbol][timeframe]) {
      logger.warn(
        `No existing data for ${symbol} ${timeframe}. Initialize candle data first.`
      );
      return;
    }

    const marketDataEntry = this.marketData[symbol][timeframe];

    // Update median data
    const limit = timeframeCandleMapping[timeframe]!;
    if (marketDataEntry.volumes.length === limit) {
      const removed = marketDataEntry.medianData.remove(
        marketDataEntry.volumes.at(-limit)!!
      );
      if (!removed) {
        logger.error(`Failed to remove volume data for ${symbol} ${timeframe}`);
      }
    }
    logger.debug(
      `Adding volume: ${
        candleData.volume
      } for symbol ${symbol}, prev: ${marketDataEntry.medianData.getMedian()}`
    );
    marketDataEntry.medianData.add(candleData.volume);

    // Update candle data
    propertyMappings.forEach(([candleArrayProp, addCandleProp]) => {
      const array = marketDataEntry[candleArrayProp] as number[];
      array.shift();
      array.push(candleData[addCandleProp]);
    });

    // Update EMA
    marketDataEntry.emaData.addEMA(candleData.closePrice);

    //Run algorithms
    this.algoManager.runAlgorithms(symbol, timeframe);
  }

  public hasData(symbol: string, timeframe: Timeframe) {
    return (
      this.marketData[symbol] &&
      this.marketData[symbol][timeframe] &&
      this.marketData[symbol][timeframe].closingTimestamps.length > 0
    );
  }

  public getCandleData(symbol: string, timeframe: Timeframe): AddCandleData {
    if (!this.hasData(symbol, timeframe)) {
      logger.warn(
        `No existing data for ${symbol} ${timeframe}. Initialize candle data first.`
      );
      return {} as AddCandleData;
    }
    const marketDataEntry = this.marketData[symbol][timeframe];
    return {
      openingTimestamp: marketDataEntry.openingTimestamps.at(-1)!,
      openPrice: marketDataEntry.openPrices.at(-1)!,
      highPrice: marketDataEntry.highPrices.at(-1)!,
      lowPrice: marketDataEntry.lowPrices.at(-1)!,
      closePrice: marketDataEntry.closePrices.at(-1)!,
      volume: marketDataEntry.volumes.at(-1)!,
      closingTimestamp: marketDataEntry.closingTimestamps.at(-1)!,
    };
  }
}

export default MarketDataManager;
