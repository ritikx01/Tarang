import { Request, Response } from "express";
import { marketDataManager } from "../../index";

function getActiveSymbols(req: Request, res: Response) {
  const result: Record<string, string[]> = {};
  for (const symbol in marketDataManager.marketData) {
    result[symbol] = Object.keys(marketDataManager.marketData[symbol]);
  }
  res.json(result);
  return;
}

export default getActiveSymbols;
