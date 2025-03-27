import { Timeframe } from "../services/MarketDataManager";
import { marketDataManager } from "../index";
import logger from "../utils/logger";

function aboveEMA(
  symbol: string,
  timeframe: Timeframe,
) {
  if (marketDataManager.hasData(symbol, timeframe)) {
    const closingPrice =
      marketDataManager.marketData[symbol][timeframe].closePrices.at(-1);
    const ema =
      marketDataManager.marketData[symbol][timeframe].emaData.getEMA("100");
    if (!closingPrice || !ema) {
      logger.warn(`Incomplete market data for ${symbol} ${timeframe}`);
      return false;
    }
    if (closingPrice >= ema) {
			logger.debug(`EMA passed for ${symbol} ${timeframe}`);
      return true;
    }
		logger.debug(`EMA failed for ${symbol} ${timeframe}. Closing price: ${closingPrice}, EMA: ${ema}`);
  }
	logger.debug(`EMA failed for ${symbol} ${timeframe}. Reason: No data available`);
	return false;
}

export default aboveEMA;