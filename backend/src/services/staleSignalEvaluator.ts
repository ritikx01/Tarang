import { prisma } from "../index";
import axios from "axios";
import { Kline, KlineDataPoint } from "../data/fetchKlineData";
import logger from "../utils/logger";
import { $Enums } from "@prisma/client";

type BinanceIntervals = "1m" | "1d";
let conditionCache: { [price: number]: number } = {};
async function staleSignalValidator(): Promise<StaleSignal[]> {
  let staleSignals: StaleSignal[] = [];
  try {
    staleSignals = await prisma.$queryRaw`
    SELECT s.*
    FROM "Signal" s
    LEFT JOIN (
      SELECT "signalId", COUNT(*) AS outcome_count
      FROM "Outcome"
      GROUP BY "signalId"
    ) o ON o."signalId" = s."id"
    WHERE array_length(s."rules", 1) IS DISTINCT FROM o.outcome_count
  `;
  } catch (error) {
    logger.error("Error fetching stale signals:", error);
    throw error;
  }
  return staleSignals;
}

const binanceBaseUrl = "https://fapi.binance.com/fapi/v1";

interface OutcomeType {
  id: string;
  signalId: string;
  condition: number;
  result: number;
  targetPrice: number;
  stopPrice: number;
  duration: number;
  completedAt: Date;
}

interface StaleSignal {
  symbol: string;
  id: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: string;
  openTime: Date;
  closeTime: Date;
  createdAt: Date;
  rules: number[];
  outcomes: OutcomeType[];
}
interface Result {
  lastFoundTime: number | null;
  outcome: number;
}
export type AggregateTrade = {
  a: number; // Aggregate trade ID
  p: string; // Price
  q: string; // Quantity
  f: number; // First trade ID
  l: number; // Last trade ID
  T: number; // Timestamp
  m: boolean; // Was the buyer the maker?
};

// Do something with managing signal rules globally
const signalEvaluationRules: [number, number][] = [
  [5, 2.5],
  [5, 5],
  [10, 2.5],
  [10, 5],
  [10, 10],
];

async function fetchKlines(
  symbol: string,
  startTime: number,
  interval: BinanceIntervals
): Promise<Kline[]> {
  try {
    const params = {
      symbol,
      interval,
      startTime,
    };
    const response = await axios.get<KlineDataPoint[]>(
      `${binanceBaseUrl}/klines`,
      { params }
    );
    if (response.status !== 200 || response.data.length === 0) {
      return [];
    }
    const klineData: Kline[] = response.data.map((k) => ({
      openingTimestamp: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
      closeTime: k[6],
      quoteAssetVolume: Number(k[7]),
      numberOfTrades: k[8],
      takerBuyBaseVolume: Number(k[9]),
      takerBuyQuoteVolume: Number(k[10]),
    }));
    return klineData;
  } catch (error) {
    logger.error(`Error fetching klines for symbol ${symbol}:`, error);
    return [];
  }
}

async function fetchAggTrades(
  symbol: string,
  startTime: number
): Promise<AggregateTrade[]> {
  try {
    const params = {
      symbol,
      startTime,
    };
    const response = await axios.get<AggregateTrade[]>(
      `${binanceBaseUrl}/aggTrades`,
      {
        params,
      }
    );
    if (response.status !== 200 || response.data.length === 0) {
      return [];
    }
    return response.data;
  } catch (error) {
    logger.error("Error fetching aggTrades:", error);
    return [];
  }
}
/**
 * Determines the first time a price breaches either an up or down threshold after a given start time.
 *
 * Algorithm:
 * 1. Checks cache for pre-computed threshold times
 * 2. Progressively checks shorter timeframes (1d → 1m → aggTrades) ONLY if:
 *    - A breach is detected in the current timeframe, OR
 *    - No data exists for the current timeframe
 * 3. Uses price aggregation to avoid floating-point precision issues
 * 4. Implements multiple safeguards against infinite loops
 *
 * @param basePrice - Reference price (usually candle open)
 * @param upPercentage - Upward threshold percentage (e.g., 5 for 5%)
 * @param downPercentage - Downward threshold percentage (e.g., 2.5 for 2.5%)
 * @param startTime - Timestamp to begin checking (usually candle close time)
 * @returns \{Timestamp, result\} of first breach, or {null, 0} if none found within max attempts
 *
 * Behavior:
 * - Returns cached result immediately if available
 * - For detected breaches: Returns exact trade time (1m) or candle close time (1d)
 * - Falls back to higher timeframe result if precise time can't be determined
 * - Guaranteed termination via MAX_ATTEMPTS/MAX_TRADE_ATTEMPTS
 */
async function checkCondition(
  staleSignal: StaleSignal,
  basePrice: number,
  upPercentage: number,
  downPercentage: number,
  startTime: number
): Promise<Result> {
  const symbol = staleSignal.symbol;

  // Rounding becuase floating point precision issues
  const decimals = 8;
  const upTarget =
    Math.round(basePrice * (1 + upPercentage / 100) * 10 ** decimals) /
    10 ** decimals;
  const downTarget =
    Math.round(basePrice * (1 + downPercentage / 100) * 10 ** decimals) /
    10 ** decimals;
  // Check cache
  const upTime = conditionCache[upTarget];
  const downTime = conditionCache[downTarget];

  // Calculate required data
  let interval: BinanceIntervals = "1d"; // To-do: Increase the default to 1M
  let klines = await fetchKlines(symbol, startTime, interval);

  const result: Result = {
    lastFoundTime: null,
    outcome: 0,
  };

  // For infinite loop guard, should mot be triggered, but just in case
  const MAX_ATTEMPTS = 10;
  let attemptCount = 0;

  const outcomeTime = Math.min(
    upTime !== undefined ? upTime : Infinity,
    downTime !== undefined ? downTime : Infinity
  );
  if (outcomeTime === upTime) {
    return { lastFoundTime: upTime, outcome: 1 };
  } else if (outcomeTime === downTime) {
    return { lastFoundTime: downTime, outcome: -1 };
  }
  // Check until lowest timeframe
  while (attemptCount++ < MAX_ATTEMPTS) {
    for (const k of klines) {
      const high = Number(k.high);
      const low = Number(k.low);

      if (high >= upTarget || low <= downTarget) {
        result.lastFoundTime = k.closeTime;

        if (high >= upTarget) {
          result.outcome = 1;
        } else {
          result.outcome = -1;
        }

        // Only switch to shorter timeframe if we found a breach
        switch (interval) {
          case "1d":
            interval = "1m";
            break;
          case "1m":
            let tradeStartTime = startTime;
            let tradeAttempts = 0;
            const MAX_TRADE_ATTEMPTS = 5;

            while (tradeAttempts++ < MAX_TRADE_ATTEMPTS) {
              const aggTrades = await fetchAggTrades(symbol, tradeStartTime);
              if (aggTrades.length === 0) break;

              for (const trade of aggTrades) {
                const price = Number(trade.p);
                const time = trade.T;

                if (price >= upTarget) {
                  conditionCache[upTarget] = time;
                  result.lastFoundTime = time;
                  result.outcome = 1;
                  return result;
                }
                if (price <= downTarget) {
                  conditionCache[downTarget] = time;
                  result.lastFoundTime = time;
                  result.outcome = -1;
                  return result;
                }
              }
              tradeStartTime = aggTrades[aggTrades.length - 1].T + 1;
            }

            // If we exhausted trade attempts but didn't find exact breach,
            // return the candle open time where breach was detected
            return result;
        }
        klines = await fetchKlines(symbol, startTime, interval);
        break;
      }
    }
    // No breach was found in current klines
    if (result.lastFoundTime) {
      return result;
    }
    // If no breach found and klines are empty, try next interval
    if (klines.length === 0) {
      switch (interval) {
        case "1d":
          interval = "1m";
          break;
        case "1m":
          return { lastFoundTime: null, outcome: 0 };
      }
      klines = await fetchKlines(symbol, startTime, interval);
    } else {
      // No breach and klines not empty - move to next time period
      startTime = klines[klines.length - 1].closeTime + 1;
      klines = await fetchKlines(symbol, startTime, interval);
    }
  }
  // Max attempts reached
  return result || { lastFoundTime: null, outcome: 0 };
}

async function staleSignalEvaluator(): Promise<void> {
  let staleSignals: StaleSignal[] = [];
  try {
    staleSignals = await staleSignalValidator();
  } catch (error) {
    return;
  }
  for (const staleSignal of staleSignals) {
    conditionCache = {};
    const startTime = staleSignal.closeTime.getTime();
    const rules = staleSignal.rules;
    signalEvaluationRules.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const ruleOfSignal of rules) {
      const ruleId = ruleOfSignal - 1;
      const [up, down] = signalEvaluationRules[ruleId];
      const evaluationResult = await checkCondition(
        staleSignal,
        staleSignal.open,
        up,
        down,
        startTime
      );
      if (evaluationResult.outcome !== 0) {
        // Write to DB
        const outcome: OutcomeType = {
          id: "",
          signalId: staleSignal.id,
          condition: ruleId,
          result: evaluationResult.outcome,
          targetPrice:
            Math.round(staleSignal.open * (1 + up / 100) * 10 ** 8) / 10 ** 8,
          stopPrice:
            Math.round(staleSignal.open * (1 + down / 100) * 10 ** 8) / 10 ** 8,
          duration: 0,
          completedAt: new Date(),
        };
        try {
          await prisma.outcome.create({
            data: {
              signalId: staleSignal.id,
              condition: ruleId,
              result: outcome.result,
              // Change after implementing SMART evaluation
              evalType: $Enums.EvalType.NORMAL,
              targetPrice: outcome.targetPrice,
              stopPrice: outcome.stopPrice,
              duration: BigInt(outcome.duration),
              completedAt: outcome.completedAt,
            },
          });
          logger.info(`Stale signal ${staleSignal.id} evaluated successfully.`);
        } catch (error) {
          logger.error(
            `Failed to create outcome for stale signal ${staleSignal.id}:`,
            error
          );
        }
      }
    }
  }
}
export default staleSignalEvaluator;
