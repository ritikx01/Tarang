import logger from "../utils/logger";
import fetchKlineData from "../data/fetchKlineData";
import fetchSymbolList from "../data/fetchSymbolList";
import FetchKlineStream from "../data/fetchKlineStream";
import AlgoManager from "./algoManager";
import { KlineDataExtracted } from "../data/fetchKlineData";
import {
  indicatorRegistry,
  IndicatorTracker,
} from "../indicators/indicatorRegistry";
import { emaCrossingClose } from "./emaCrossingClose";

type IndicatorMap = {
  [Entry in (typeof indicatorRegistry)[number] as Entry["key"]]: InstanceType<
    Entry["Class"]
  >;
};

interface CandleData extends KlineDataExtracted {
  indicators: IndicatorMap;
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
const propertyMappings: [
  keyof KlineDataExtracted & string,
  keyof AddCandleData
][] = [
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
  "5m": 144,
  // "15m": 96,
};

function createIndicatorInstances(
  symbol: string,
  timeframe: Timeframe,
  klineData: KlineDataExtracted,
  limit: number
): Record<string, IndicatorTracker> {
  const indicators: Record<string, IndicatorTracker> = {};
  for (const { key, Class } of indicatorRegistry) {
    indicators[key] = new Class(symbol, timeframe, klineData, limit);
  }
  return indicators;
}

class MarketDataManager {
  // Make marketData private and add getter
  public marketData: MarketDataStore = {};
  public fetchklineStream: FetchKlineStream;
  private algoManager: AlgoManager;

  constructor() {
    this.fetchklineStream = new FetchKlineStream();
    this.algoManager = new AlgoManager();
  }

  public async initializeMarketDataManager() {
    try {
      let symbols = await fetchSymbolList();
      const count = symbols.length;
      logger.info(
        `Successfully fetched symbol list containing ${count} symbols`
      );
      let counter = 0;
      const toFilter: string[] = [];
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
            logger.info(
              `Successfully fetched ${symbol} ${timeframe} data: ${klineData.closingTimestamps.length} candles`
            );
            if (klineData.closingTimestamps.length < fetchCandleCount) {
              toFilter.push(symbol);
              continue;
            }
            if (!this.marketData[symbol]) {
              this.marketData[symbol] = {};
            }
            this.marketData[symbol][timeframe] = {
              ...klineData,
              indicators: createIndicatorInstances(
                symbol,
                timeframe as Timeframe,
                klineData,
                limit
              ),
            };
            for (const [arrayKey] of propertyMappings) {
              this.marketData[symbol][timeframe][arrayKey] = this.marketData[
                symbol
              ][timeframe][arrayKey].slice(-limit);
            }
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
      logger.info(`Filering out ${toFilter.length} symbols: ${toFilter}`);
      symbols = symbols.filter((symbol) => !toFilter.includes(symbol));
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
    const firstCandle = this.getCandleData(symbol, timeframe, 0);
    const lastCandle = this.getCandleData(symbol, timeframe, -1);
    if (!firstCandle.closePrice) {
      logger.error(`Failed to remove volume data for ${symbol} ${timeframe}`);
      return;
    }
    logger.debug(`Adding volume: ${candleData.volume} for symbol ${symbol}`);

    // Update candle data
    propertyMappings.forEach(([candleArrayProp, addCandleProp]) => {
      const array = marketDataEntry[candleArrayProp] as number[];
      array.shift();
      array.push(candleData[addCandleProp]);
    });
    // Implement error handling
    for (const [key, value] of Object.entries(marketDataEntry.indicators)) {
      logger.debug(`Updating indicator ${key}`);
      value.update(candleData, firstCandle, lastCandle);
    }

    //Run algorithms
    this.algoManager.runAlgorithms(symbol, timeframe);
    const ema9 = marketDataEntry.indicators["emaData"].getValue({ period: 9 });
    const ema21 = marketDataEntry.indicators["emaData"].getValue({
      period: 21,
    });
    if (candleData.closePrice <= ema21) {
      emaCrossingClose.updateSignal(symbol, candleData, ema9, ema21);
    }
  }

  public hasData(symbol: string, timeframe: Timeframe) {
    return (
      this.marketData[symbol] &&
      this.marketData[symbol][timeframe] &&
      this.marketData[symbol][timeframe].closingTimestamps.length > 0
    );
  }

  public getCandleData(
    symbol: string,
    timeframe: Timeframe,
    index: number = -1
  ): AddCandleData {
    if (!this.hasData(symbol, timeframe)) {
      logger.warn(
        `No existing data for ${symbol} ${timeframe}. Initialize candle data first.`
      );
      return {} as AddCandleData;
    }
    const marketDataEntry = this.marketData[symbol][timeframe];
    return {
      openingTimestamp: marketDataEntry.openingTimestamps.at(index)!,
      openPrice: marketDataEntry.openPrices.at(index)!,
      highPrice: marketDataEntry.highPrices.at(index)!,
      lowPrice: marketDataEntry.lowPrices.at(index)!,
      closePrice: marketDataEntry.closePrices.at(index)!,
      volume: marketDataEntry.volumes.at(index)!,
      closingTimestamp: marketDataEntry.closingTimestamps.at(index)!,
    };
  }
}

export default MarketDataManager;
