import logger from "../utils/logger";

const LENGTHS = [9, 15, 100];
const largest = 3 * Math.max(...LENGTHS);

interface EMAPeriod {
  "9"?: number;
  "15": number;
  "100": number;
}

class EMATracker {
  private emaData: EMAPeriod;
  private closePrice: number[];

  constructor(closePrice: number[]) {
    this.closePrice = closePrice;
    this.emaData = {
      "9": -1,
      "15": -1,
      "100": -1,
    };
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
      this.emaData[String(period) as keyof EMAPeriod] = new_ema;
    }
    if (this.closePrice.length > largest) {
      this.closePrice = [];
    }
  }

  public addEMA(price: number) {
    for (const period of LENGTHS) {
      const prevEMA = this.emaData[String(period) as keyof EMAPeriod] || price;

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
          this.emaData[String(period) as keyof EMAPeriod] =
            this.closePrice.slice(-period).reduce((a, b) => a + b, 0) / period;
        }
        continue;
      }
      const multiplier = 2 / (period + 1);
      const new_ema = (price - prevEMA) * multiplier + prevEMA;
      this.emaData[String(period) as keyof EMAPeriod] = new_ema;
    }
  }

  public getEMA(period: keyof EMAPeriod) {
    return this.emaData[period];
  }
}

export default EMATracker;
