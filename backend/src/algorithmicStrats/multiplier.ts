import { Timeframe } from "../services/MarketDataManager";
import { marketDataManager } from "../index";

const MIN_MULTIPLIER = 2.5;
const MAX_MULTIPLIER = 13;

function multiplier(symbol: string, timeframe: Timeframe, length = 20) {
  const marketDataEntry = marketDataManager.marketData[symbol][timeframe];
  const openPrices = marketDataEntry.openPrices.slice(-length);
  const closePrices = marketDataEntry.closePrices.slice(-length);

  if (openPrices.length < length || closePrices.length < length) return false;

  let total = 0;
  for (let i = 0; i < length; i++) {
    total += Math.abs(openPrices[i] - closePrices[i]);
  }
  const average = total / length;

  const ema100 = marketDataEntry.indicators["emaData"].getValue({
    period: 100,
  });
  const candleClose = closePrices.at(-1)!;
  const distanceFromEMA = candleClose - ema100;

  if (distanceFromEMA <= 0) return false;

  return (
    average * MIN_MULTIPLIER <= distanceFromEMA &&
    distanceFromEMA <= average * MAX_MULTIPLIER
  );
}

export default multiplier;
