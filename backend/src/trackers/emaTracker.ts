const PERIODS = [9, 15, 100];
import logger from "../utils/logger";

export interface EMAData {
  "9"?: number;
  "15": number;
  "100": number;
}

class EMATracker {
  private emaData: EMAData;
  private closePrice: number[];
  private largest: number;

  constructor(closePrice: number[]) {
    this.largest = Math.max(...PERIODS);
    this.closePrice = closePrice;
    this.emaData = {
      "9": -1,
      "15": -1,
      "100": -1,
    };
    for (const period of PERIODS) {
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
      this.emaData[String(period) as keyof EMAData] = new_ema;
    }
    if (this.closePrice.length > this.largest) {
      this.closePrice = [];
    }
  }

  public addEMA(price: number) {
    for (const period of PERIODS) {
      const prevEMA = this.emaData[String(period) as keyof EMAData] || price;

      // Insufficent data for EMA calculation
      if (prevEMA === -1) {
        // Store price data untill desired count is reached
        if (this.closePrice.length < period) {
          logger.error(
            `Insufficient data size for ${period}-period EMA. Data size: ${this.closePrice.length}`
          );
          this.closePrice.push(price);
          break;
        } else if (this.closePrice.length > this.largest) {
          this.closePrice = [];
        } else {
          this.emaData[String(period) as keyof EMAData] =
            this.closePrice.reduce((a, b) => a + b, 0) / period;
        }
      }
      const multiplier = 2 / (period + 1);
      const new_ema = (price - prevEMA) * multiplier + prevEMA;
      this.emaData[String(period) as keyof EMAData] = new_ema;
    }
  }
  public getEMA(period: keyof EMAData) {
    return this.emaData[period];
  }
}

export default EMATracker;
