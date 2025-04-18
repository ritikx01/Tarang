import { Request, Response } from "express";
import { marketDataManager } from "../../index";

function getActiveIndicatorList(req: Request, res: Response) {
  const pair = Object.keys(marketDataManager.marketData)[0];
  const interval = Object.keys(marketDataManager.marketData[pair])[0];

  res.status(200).json({
    indicators: Object.keys(
      marketDataManager.marketData[pair][interval].indicators
    ),
  });
  return;
}

export default getActiveIndicatorList;
