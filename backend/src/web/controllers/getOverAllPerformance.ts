import { Request, Response } from "express";
import { prisma } from "../../index";
import { $Enums } from "@prisma/client";

async function getOverAllPerformance(req: Request, res: Response) {
  const results = await prisma.outcome.findMany({
    where: {
      evalType: $Enums.EvalType.SMART,
      condition: 1,
    },
    include: {
      signal: { select: { symbol: true, close: true } },
    },
    orderBy: { completedAt: "asc" },
  });
  const performance = [];
  let change = 0;
  let flag = 0;
  for (const result of results) {
    const symbol = result.signal.symbol.toUpperCase();
    const assetEntryPrice = result.signal.close;
    const assetExitPrice = result.targetPrice;
    const currChangePercentage = parseFloat(
      (((assetExitPrice - assetEntryPrice) / assetEntryPrice) * 100).toFixed(4)
    );
    change += currChangePercentage;
    performance.push({
      symbol,
      value: change,
      change: currChangePercentage,
      time: flag,
    });
    flag += 1;
  }
  res.json(performance);
}

export default getOverAllPerformance;
