import { KlineDataExtracted } from "../data/fetchKlineData";
import { Timeframe, AddCandleData } from "../services/MarketDataManager";

const LENGTHS = [14];
export type ATRPeriod = Record<(typeof LENGTHS)[number], number>;
const dummy: AddCandleData = {
  openingTimestamp: 0,
  openPrice: 0,
  highPrice: 0,
  lowPrice: 0,
  closePrice: 0,
  volume: 0,
  closingTimestamp: 0,
};
export class ATRTracker {
  private symbol: string;
  private timeframe: Timeframe;
  private lookback: number;
  private atrBuffers: Map<number, number[]> = new Map();
  private atrValues: Map<number, number | null> = new Map();
  private trQueues: Map<number, number[]> = new Map();
  private prevClose: number | null = null;

  constructor(
    symbol: string,
    timeframe: Timeframe,
    klineData: KlineDataExtracted,
    lookback: number
  ) {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.lookback = lookback;

    for (const l of LENGTHS) {
      this.atrBuffers.set(l, []);
      this.trQueues.set(l, []);
      this.atrValues.set(l, null);
    }

    for (let i = 0; i < klineData.closePrices.length; i++) {
      this.update(
        {
          openingTimestamp: klineData.openingTimestamps[i],
          openPrice: klineData.openPrices[i],
          highPrice: klineData.highPrices[i],
          lowPrice: klineData.lowPrices[i],
          closePrice: klineData.closePrices[i],
          volume: klineData.volumes[i],
          closingTimestamp: klineData.closingTimestamps[i],
        },
        dummy,
        dummy
      );
    }
  }

  update(
    newCandle: AddCandleData,
    firstCandle: AddCandleData,
    lastCandle: AddCandleData
  ): void {
    const candle = {
      high: newCandle.highPrice,
      low: newCandle.lowPrice,
      close: newCandle.closePrice,
    };
    const { high, low, close } = candle;
    if (this.prevClose === null) {
      this.prevClose = close;
      return;
    }

    const tr = Math.max(
      high - low,
      Math.abs(high - this.prevClose),
      Math.abs(low - this.prevClose)
    );

    for (const length of LENGTHS) {
      const trQueue = this.trQueues.get(length)!;
      let atr = this.atrValues.get(length);

      if (atr === null) {
        trQueue.push(tr);
        if (trQueue.length === length) {
          atr = trQueue.reduce((sum, val) => sum + val, 0) / length;
          this.atrValues.set(length, atr);
        }
      } else {
        // Wilder's smoothing
        atr = (atr! * (length - 1) + tr) / length;
        this.atrValues.set(length, atr);
      }

      if (atr !== null) {
        const atrBuffer = this.atrBuffers.get(length)!;
        atrBuffer.push(atr);
        if (atrBuffer.length > this.lookback) {
          atrBuffer.shift();
        }
      }
    }

    this.prevClose = close;
  }

  getValue(params?: { index?: number; period?: keyof ATRPeriod }): number {
    const period = params?.period ?? 14;
    const index = params?.index ?? -1;

    const buffer = this.atrBuffers.get(period);

    if (!buffer || buffer.length === 0) return -1;
    if (index === -1) return buffer[buffer.length - 1];
    if (index < 0 || index >= buffer.length) return -1;

    return buffer[index];
  }

  public getAll(period: keyof ATRPeriod = 14): number[] {
    return this.atrBuffers.get(period) || [];
  }
}

export default ATRTracker;
