import { Timeframe } from "../services/MarketDataManager";
import { marketDataManager } from "../index";

function atrPriceRatio(symbol: string, timeframe: Timeframe): boolean {
  const marketData = marketDataManager.marketData[symbol]?.[timeframe];
  if (!marketData) return false;

  const atr = marketData.indicators.atr.getValue();
  const price = marketData.closePrices.at(-1);

  if (atr === undefined || price === undefined || price === 0) return false;

  return (atr / price) * 100 > 1.5;
}

export default atrPriceRatio;
