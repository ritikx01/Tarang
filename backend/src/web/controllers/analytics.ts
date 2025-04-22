import { Request, Response } from "express";
import { Outcome, EvalType } from "@prisma/client";
import {
  getISOWeek,
  getMonth,
  getDate,
  getYear,
  startOfYear,
  startOfMonth,
  addYears,
  addMonths,
} from "date-fns";
import logger from "../../utils/logger";
import { prisma } from "../../index";

type PerformanceInterval = "D" | "W" | "M" | "Y";
const performanceIntervals: readonly PerformanceInterval[] = [
  "D",
  "W",
  "M",
  "Y",
] as const;

interface OutcomeWithSignalOpen extends Outcome {
  signal: { symbol: string; open: number } | null;
}

interface PeriodSummary {
  index: number;
  value: number;
}

interface RuleStats {
  totalPercentageSum: number;
  tradeCount: number;
}
type RulePeriodMap = Map<number, RuleStats>;
type RuleData = Record<number, RulePeriodMap>;
type RuleMap = Record<EvalType, RuleData>;

type RuleResult = Record<number, PeriodSummary[]>;
type EvalResult = Record<EvalType, RuleResult>;

interface ValidatedInput {
  interval: PerformanceInterval;
  startEpoch: number;
}

function isValidInterval(value: unknown): value is PerformanceInterval {
  return (
    typeof value === "string" &&
    (performanceIntervals as ReadonlyArray<string>).includes(value)
  );
}

function isValidEpoch(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    !Number.isNaN(value) &&
    value > 946684800000 &&
    value < 9999999999999
  );
}

function parseAndValidateInput(body: any): ValidatedInput | { error: string } {
  const { interval, start } = body;
  const startEpoch = Number(start);

  if (!isValidInterval(interval)) {
    return { error: "Invalid Interval parameter" };
  }
  if (!isValidEpoch(startEpoch)) {
    logger.warn(`Invalid epoch received: type=${typeof start}, value=${start}`);
    return {
      error: `Invalid Start parameter: Should be Unix epoch in ms. Received: ${start}`,
    };
  }

  return { interval, startEpoch };
}

function calculateDateRange(
  interval: PerformanceInterval,
  startEpoch: number
): { startDate: Date; endDate: Date } {
  const referenceDate = new Date(startEpoch);
  let startDate: Date;
  let endDate: Date;

  switch (interval) {
    case "D":
      startDate = startOfMonth(referenceDate);
      endDate = addMonths(startDate, 1);
      break;
    case "W":
    case "M":
    case "Y":
    default:
      startDate = startOfYear(referenceDate);
      endDate = addYears(startDate, 1);
      break;
  }
  return { startDate, endDate };
}

async function fetchOutcomeData(
  startDate: Date,
  endDate: Date
): Promise<OutcomeWithSignalOpen[]> {
  logger.info(
    `Fetching outcomes from ${startDate.toISOString()} to ${endDate.toISOString()}`
  );
  const outcomes = await prisma.outcome.findMany({
    where: {
      completedAt: { gte: startDate, lt: endDate },
    },
    include: {
      signal: { select: { symbol: true, open: true } },
    },
    orderBy: { completedAt: "asc" },
  });
  logger.info(`Fetched ${outcomes.length} outcomes.`);
  return outcomes as OutcomeWithSignalOpen[]; // Cast assuming include works
}

function aggregatePerformanceData(
  outcomes: OutcomeWithSignalOpen[],
  interval: PerformanceInterval
): EvalResult {
  const ruleMap: RuleMap = { SMART: {}, NORMAL: {} };

  for (const outcome of outcomes) {
    if (!outcome.signal || outcome.signal.open <= 0) continue;

    const assetEntryPrice = outcome.signal.open;
    let assetExitPrice: number | null = null;

    if (outcome.evalType === EvalType.SMART) {
      assetExitPrice = outcome.targetPrice;
    } else if (outcome.evalType === EvalType.NORMAL) {
      if (outcome.result === 1) assetExitPrice = outcome.targetPrice;
      else if (outcome.result === -1) assetExitPrice = outcome.stopPrice;
      else continue;
    } else continue;

    if (assetExitPrice === null || assetExitPrice <= 0) continue;

    const individualPercentChange =
      ((assetExitPrice - assetEntryPrice) / assetEntryPrice) * 100;

    const completedDate = outcome.completedAt;
    let periodIndex: number;
    try {
      switch (interval) {
        case "D":
          periodIndex = getDate(completedDate);
          break;
        case "W":
          periodIndex = getISOWeek(completedDate);
          break;
        case "M":
          periodIndex = getMonth(completedDate) + 1;
          break;
        case "Y":
          periodIndex = getYear(completedDate);
          break;
        default:
          continue;
      }
    } catch (e) {
      logger.warn(
        `Error processing date ${completedDate} for outcome ${outcome.id}`,
        e
      );
      continue;
    }

    const ruleID: number = outcome.condition;
    const evalType: EvalType = outcome.evalType;

    if (!ruleMap[evalType][ruleID]) {
      ruleMap[evalType][ruleID] = new Map<number, RuleStats>();
    }
    const periodMap = ruleMap[evalType][ruleID];
    const currentPeriodData = periodMap.get(periodIndex) ?? {
      totalPercentageSum: 0,
      tradeCount: 0,
    };

    currentPeriodData.totalPercentageSum += individualPercentChange;
    currentPeriodData.tradeCount += 1;
    logger.debug(
      outcome.signal.symbol,
      outcome.completedAt.getDate(),
      outcome.completedAt.getMonth() + 1,
      outcome.signal.open,
      outcome.targetPrice,
      currentPeriodData
    );
    periodMap.set(periodIndex, currentPeriodData);
  }

  const results: EvalResult = { NORMAL: {}, SMART: {} };
  for (const evalTypeStr in ruleMap) {
    const evalType = evalTypeStr as EvalType;
    results[evalType] = {};
    for (const ruleIDStr in ruleMap[evalType]) {
      const ruleID = Number(ruleIDStr);
      const periodMap = ruleMap[evalType][ruleID];
      const periodSummaries: PeriodSummary[] = [];

      for (const [index, data] of periodMap.entries()) {
        let averagePercentChange =
          data.tradeCount > 0 ? data.totalPercentageSum / data.tradeCount : 0;
        periodSummaries.push({ index, value: averagePercentChange });
      }

      periodSummaries.sort((a, b) => a.index - b.index);
      results[evalType][ruleID] = periodSummaries;
    }
  }
  return results;
}

async function getPeriodicPerformance(req: Request, res: Response) {
  const validationResult = parseAndValidateInput(req.body);
  if ("error" in validationResult) {
    res.status(400).json({ error: { message: validationResult.error } });
    return;
  }
  const { interval, startEpoch } = validationResult;

  try {
    const { startDate, endDate } = calculateDateRange(interval, startEpoch);
    const outcomes = await fetchOutcomeData(startDate, endDate);

    if (outcomes.length === 0) {
      logger.info(
        `No outcomes found for interval ${interval} between ${startDate.toISOString()} and ${endDate.toISOString()}`
      );
      res.status(200).json({ NORMAL: {}, SMART: {} });
      return;
    }

    const results = aggregatePerformanceData(outcomes, interval);

    res.status(200).json(results);
    return;
  } catch (error) {
    logger.error(
      `Error in getPeriodicPerformance: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error
    );
    res.status(500).json({ error: { message: "Internal Server Error" } });
    return;
  }
}

export default getPeriodicPerformance;
