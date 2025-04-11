import logger from "../utils/logger";
import { AddCandleData } from "../services/MarketDataManager";

const LENGTHS = [
  9,
  // 12, // MACD
  // 15,
  // 20,
  21,
  // 26, // MACD
  // 50, // Golden Cross
  // 55, // Fibonacci
  100,
  // 200, // Golden Cross
  // 233, // Fibonacci
];
const largest = 3 * Math.max(...LENGTHS);

export type EMAPeriod = Record<(typeof LENGTHS)[number], number>;

class EMATracker {
  private lookback: number;
  private emaHistory: Record<number, number[]>;
  private closePrice: number[];

  constructor(closePrice: number[], lookback: number) {
    this.lookback = lookback;
    this.closePrice = closePrice;
    this.emaHistory = Object.fromEntries(LENGTHS.map((p) => [p, []])) as Record<
      number,
      number[]
    >;

    for (const period of LENGTHS) {
      if (closePrice.length < period) {
        logger.error(
          `Insufficient data size for ${period}-period EMA. Data size: ${closePrice.length}`
        );
        break;
      }
      let new_ema =
        closePrice.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const multiplier = 2 / (period + 1);
      for (const price of closePrice.slice(period)) {
        const prevEMA = new_ema;
        new_ema = (price - prevEMA) * multiplier + prevEMA;
      }
      this.emaHistory[period].push(new_ema);
    }
    if (this.closePrice.length > largest) {
      this.closePrice = [];
    }
  }

  // This method exists only to maintain uniformity across all trackers
  public update(
    newCandle: AddCandleData,
    firstCandle: AddCandleData,
    lastCandle: AddCandleData
  ) {
    const price: number = newCandle.closePrice;
    this.add(price);
  }

  private add(price: number) {
    for (const period of LENGTHS) {
      const prevEMA =
        this.emaHistory[period].length > 0
          ? this.emaHistory[period][this.emaHistory[period].length - 1]
          : -1;

      // Insufficent data for EMA calculation
      if (prevEMA === -1) {
        if (this.closePrice.length < period) {
          logger.debug(
            `Insufficient data size for ${period}-period EMA. Data size: ${this.closePrice.length}`
          );
        } else {
          const sma =
            this.closePrice.slice(-period).reduce((a, b) => a + b, 0) / period;
          this.emaHistory[period].push(sma);
        }
        continue;
      }
      const multiplier = 2 / (period + 1);
      const newEMA = (price - prevEMA) * multiplier + prevEMA;
      this.emaHistory[period].push(newEMA);

      if (this.emaHistory[period].length > this.lookback) {
        this.emaHistory[period].shift();
      }
    }
  }

  public getEMA(period: keyof EMAPeriod, index: number = -1): number {
    const history = this.emaHistory[period];
    if (history.length === 0) return -1;
    if (index === -1) return history[history.length - 1];
    if (index < 0 || index >= history.length) {
      logger.warn(`Invalid EMA index ${index} for period ${period}`);
      return -1;
    }
    return history[index];
  }
}

export default EMATracker;
