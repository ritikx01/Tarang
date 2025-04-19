import { Timeframe, AddCandleData } from "./MarketDataManager";
import { prisma } from "../index";
import { $Enums } from "@prisma/client";
import { signalManager } from "../index";

export type SignalResultType = -1 | 0 | 1;
interface SignalInfo {
  timeframe: Timeframe;
  candleData: AddCandleData;
  rulesEvaluationResult: Map<number, SignalResultType>;
  signalId: string;
}
interface SignalToDB {
  data: {
    signalId: string;
    condition: number;
    result: number;
    evalType: $Enums.EvalType;
    targetPrice: number;
    stopPrice: number;
    duration: number;
    completedAt: Date;
  };
}
class EMACrossingClose {
  private activeSignalsStore: Set<string>;
  private getActiveSignalsStore: Record<string, SignalInfo> = {};
  constructor() {
    this.activeSignalsStore = new Set();
  }
  public addSignal(symbol: string) {
    if (this.getActiveSignalsStore[symbol]) {
      return;
    }
    this.activeSignalsStore.add(symbol);
    this.getActiveSignalsStore[symbol] =
      signalManager.getActiveSignals()[symbol];
    console.log(`NEW SMART SIGNAL FOR: ${symbol}`);
  }
  public async updateSignal(
    symbol: string,
    candleData: AddCandleData,
    ema9: number,
    ema21: number
  ) {
    if (!this.getActiveSignalsStore[symbol]) {
      return;
    }
    const signal = this.getActiveSignalsStore[symbol];
    const signalId = signal.signalId;
    console.log(`Closing signal for ${symbol}. EMA9: ${ema9}, EMA21: ${ema21}`);
    const duration =
      candleData.closingTimestamp - signal.candleData.openingTimestamp;
    const evaluation =
      candleData.closePrice > signal.candleData.closePrice ? 1 : -1;
    const result: SignalToDB = {
      data: {
        signalId,
        condition: 1,
        result: evaluation,
        targetPrice: candleData.closePrice,
        evalType: $Enums.EvalType.SMART,
        stopPrice: 0,
        duration,
        completedAt: new Date(candleData.closingTimestamp),
      },
    };
    console.log(`CLOSED SMART FOR ${symbol}`);
    await prisma.outcome.create(result);
    delete this.getActiveSignalsStore[symbol];
  }
}

export const emaCrossingClose = new EMACrossingClose();
