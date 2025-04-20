import logger from "../utils/logger";
import { Timeframe } from "./MarketDataManager";
import { AddCandleData } from "./MarketDataManager";
import { prisma } from "../index";
import { $Enums } from "@prisma/client";

interface SignalRules {
  [id: number]: [number, number];
}

export const signalEvaluationRules: SignalRules = {
  1: [5, 5],
  2: [5, 2.5],
  3: [10, 2.5],
  4: [10, 5],
  5: [10, 10],
};

const rulesToEvaluate: number[] = [1, 2, 3, 4, 5];

interface SignalInfo {
  timeframe: Timeframe;
  candleData: AddCandleData;
  rulesEvaluationResult: Map<number, SignalResultType>;
  signalId: string;
}

export type SignalResultType = -1 | 0 | 1;

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

/**
 * Validates and tracks active signals against evaluation rules.
 * Buffers results and periodically batches writes to the database.
 */
export default class SignalManager {
  private activeSignalsStore: Record<string, SignalInfo> = {};
  private outcomesBuffer: SignalToDB["data"][] = [];
  private isWriting = false;

  constructor() {
    setInterval(() => this.batchDBWrite(), 5000);
    process.on("SIGINT", async () => {
      await this.batchDBWrite();
      process.exit();
    });
  }

  /**
   * Registers a new signal to track and store in DB.
   * @param symbol Trading symbol
   * @param timeframe Timeframe of signal
   * @param candleData Candle data
   * @param rulesVersion Version of rule set
   */
  public async addSignal(
    symbol: string,
    timeframe: Timeframe,
    candleData: AddCandleData
  ): Promise<void> {
    try {
      if (this.activeSignalsStore[symbol]) {
        logger.warn(`Signal already exists for ${symbol}. Exiting.`);
        return;
      }

      const rulesEvaluationResult = new Map<number, SignalResultType>(
        rulesToEvaluate.map((rule) => [rule, 0])
      );

      const openTime = new Date(candleData.openingTimestamp);
      const closeTime = new Date(candleData.closingTimestamp);

      const signal = await prisma.signal.create({
        data: {
          symbol,
          open: candleData.openPrice,
          high: candleData.highPrice,
          low: candleData.lowPrice,
          close: candleData.closePrice,
          volume: candleData.volume,
          rules: rulesToEvaluate,
          timeframe,
          openTime,
          closeTime,
        },
      });

      this.activeSignalsStore[symbol] = {
        timeframe,
        candleData,
        rulesEvaluationResult,
        signalId: signal.id,
      };

      logger.info(
        `Added BUY signal for ${symbol} at price ${candleData.closePrice}`
      );
    } catch (error) {
      logger.error(
        `Error in addSignal for ${symbol}: ${
          error instanceof Error ? error.stack : error
        }`
      );
    }
  }

  /**
   * Updates the signal for a given symbol based on new candle data.
   * @param symbol Trading symbol
   * @param timeframe Timeframe
   * @param candleData New candle data
   */
  public async updateSignals(
    symbol: string,
    timeframe: Timeframe,
    candleData: AddCandleData
  ): Promise<void> {
    if (!this.activeSignalsStore[symbol]) {
      logger.debug(`No active signal for ${symbol}. Exiting.`);
      return;
    }

    const signal = this.activeSignalsStore[symbol];

    const buyPrice = signal.candleData.closePrice;
    const evaluated: number[] = [];
    for (const ruleId of rulesToEvaluate) {
      if (!signal.rulesEvaluationResult.has(ruleId)) continue;

      const [win, loss] = signalEvaluationRules[ruleId];
      const winThreshold =
        Math.round(buyPrice * (1 + win / 100) * 10 ** 8) / 10 ** 8;
      const lossThreshold =
        Math.round(buyPrice * (1 - loss / 100) * 10 ** 8) / 10 ** 8;
      let evaluation: SignalResultType = 0;

      if (candleData.closePrice >= winThreshold) {
        evaluation = 1;
      } else if (candleData.closePrice <= lossThreshold) {
        evaluation = -1;
      }

      if (evaluation !== 0) {
        signal.rulesEvaluationResult.set(ruleId, evaluation);
        evaluated.push(ruleId);

        const signalId = signal.signalId;
        const duration =
          candleData.closingTimestamp - signal.candleData.openingTimestamp;

        this.outcomesBuffer.push({
          signalId,
          condition: ruleId,
          result: evaluation,
          targetPrice: winThreshold,
          evalType: $Enums.EvalType.NORMAL,
          stopPrice: lossThreshold,
          duration,
          completedAt: new Date(candleData.closingTimestamp),
        });

        logger.info(
          `Signal evaluation for ${symbol} at ${candleData.closingTimestamp}: ${
            evaluation === 1 ? "Win" : "Loss"
          } for rule ${ruleId}`
        );
      } else {
        logger.debug(
          `No evaluation for ${symbol} at ${candleData.closingTimestamp}`
        );
      }
    }

    evaluated.forEach((id) => signal.rulesEvaluationResult.delete(id));
    if (signal.rulesEvaluationResult.size === 0) {
      delete this.activeSignalsStore[symbol];
      logger.info(`Signal for ${symbol} fully evaluated and removed.`);
    }
  }

  /**
   * Flushes buffered outcomes to the database in chunks.
   */
  private async batchDBWrite(): Promise<void> {
    if (this.isWriting || this.outcomesBuffer.length === 0) return;

    this.isWriting = true;
    try {
      const batch = this.outcomesBuffer.splice(0, this.outcomesBuffer.length);
      const CHUNK_SIZE = 200;

      for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        await prisma.outcome.createMany({
          data: batch.slice(i, i + CHUNK_SIZE),
          skipDuplicates: true,
        });
      }

      logger.info(`Batch write successful: ${batch.length} outcomes saved.`);
    } catch (error) {
      logger.error(
        `Error in batchDBWrite: ${error instanceof Error ? error.stack : error}`
      );
    } finally {
      this.isWriting = false;
    }
  }
  public getActiveSignals() {
    return this.activeSignalsStore;
  }
  public getrulesToEvaluate() {
    return rulesToEvaluate;
  }

  public async removeSignal(symbol: string): Promise<boolean> {
    try {
      if (!this.activeSignalsStore[symbol]) {
        logger.error(`Signal for ${symbol} not active`);
        return false;
      }
      const id = this.activeSignalsStore[symbol].signalId;
      await prisma.outcome.deleteMany({
        where: { signalId: id },
      });
      logger.info(
        `Successfully removed all outcomes from DB for ${symbol} (${id})`
      );
      await prisma.signal.delete({
        where: { id },
      });
      logger.info(`Successfully removed Signal from DB for ${symbol} (${id})`);
      delete this.activeSignalsStore[symbol];
      logger.info(
        `Successfully removed Signal from memory for ${symbol} (${id})`
      );
      return true;
    } catch (error) {
      logger.error(
        `Unable to delete signal for ${symbol} due to error: ${error}`
      );
      return false;
    }
  }
}
