import EMATracker, { EMAPeriod } from "../trackers/emaTracker";
import MedianTracker from "../trackers/medianTracker";
import { AddCandleData } from "../services/MarketDataManager";
import { KlineDataExtracted } from "../data/fetchKlineData";
import { Timeframe } from "../services/MarketDataManager";
import ATRTracker, { ATRPeriod } from "../trackers/atrTracker";

export interface IndicatorTracker {
  update(
    newCandle: AddCandleData,
    firstCandle: AddCandleData,
    lastCandle: AddCandleData
  ): void;
  getValue(params?: {
    index?: number;
    period?: keyof EMAPeriod | keyof ATRPeriod;
  }): number;
  getAll(): Record<number, number[]> | number[];
}
interface IndicatorMeta {
  key: string;
  Class: new (
    symbol: string,
    timeframe: Timeframe,
    klineData: KlineDataExtracted,
    lookback: number
  ) => IndicatorTracker;
}

export const indicatorRegistry: IndicatorMeta[] = [
  { key: "emaData", Class: EMATracker },
  { key: "medianData", Class: MedianTracker },
  { key: "atr", Class: ATRTracker },
] as const;
