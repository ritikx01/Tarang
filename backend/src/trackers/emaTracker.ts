import logger from "../utils/logger";

const LENGTHS = [
  9,
  12, // MACD
  15,
  20,
  21,
  26, // MACD
  50, // Golden Cross
  55, // Fibonacci
  100,
  200, // Golden Cross
  233, // Fibonacci
];
const largest = 3 * Math.max(...LENGTHS);

export type EMAPeriod = Record<(typeof LENGTHS)[number], number>;

class EMATracker {
  private emaData: EMAPeriod;
  private closePrice: number[];

  constructor(closePrice: number[]) {
    this.closePrice = closePrice;
    this.emaData = Object.fromEntries(
      LENGTHS.map((period) => [period, -1])
    ) as EMAPeriod;

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
      this.emaData[period] = new_ema;
    }
    if (this.closePrice.length > largest) {
      this.closePrice = [];
    }
  }

  public addEMA(price: number) {
    for (const period of LENGTHS) {
      const prevEMA = this.emaData[period] || price;

      // Insufficent data for EMA calculation
      if (prevEMA === -1) {
        // Store price data untill desired count is reached
        if (this.closePrice.length < period) {
          logger.error(
            `Insufficient data size for ${period}-period EMA. Data size: ${this.closePrice.length}`
          );
          this.closePrice.push(price);
        } else if (this.closePrice.length > largest) {
          this.closePrice = [];
        } else {
          this.emaData[period] =
            this.closePrice.slice(-period).reduce((a, b) => a + b, 0) / period;
        }
        continue;
      }
      const multiplier = 2 / (period + 1);
      const new_ema = (price - prevEMA) * multiplier + prevEMA;
      this.emaData[period] = new_ema;
    }
  }

  public getEMA(period: keyof EMAPeriod): number {
    return this.emaData[period];
  }
}

export default EMATracker;
