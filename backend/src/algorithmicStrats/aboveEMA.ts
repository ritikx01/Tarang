import { Timeframe } from "../services/MarketDataManager";
import { marketDataManager } from "../index";
import logger from "../utils/logger";

function aboveEMA(symbol: string, timeframe: Timeframe) {
  if (marketDataManager.hasData(symbol, timeframe)) {
    const marketDataEntry = marketDataManager.marketData[symbol][timeframe];
    const closingPrice = marketDataEntry.closePrices.at(-1);
    const ema100 = marketDataEntry.indicators.emaData.getValue({ period: 100 });
    const ema21 = marketDataEntry.indicators.emaData.getValue({ period: 21 });
    const ema10 = marketDataEntry.indicators.emaData.getValue({ period: 10 });

    // Golden cross
    if (!closingPrice || !ema100 || !ema21 || !ema10) {
      logger.warn(`Incomplete market data for ${symbol} ${timeframe}`);
      return false;
    }
    if (closingPrice >= ema100 && ema21 > ema100 && ema10 > ema21) {
      logger.debug(`EMA passed for ${symbol} ${timeframe}`);
      return true;
    }
    logger.debug(
      `EMA failed for ${symbol} ${timeframe}. Closing price: ${closingPrice}, EMA100: ${ema100}, EMA21: ${ema21}, EMA10: ${ema10}`
    );
  }
  logger.debug(
    `EMA failed for ${symbol} ${timeframe}. Reason: No data available`
  );
  return false;
}

export default aboveEMA;
