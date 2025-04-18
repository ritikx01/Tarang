import { marketDataManager } from "../../index";
import { Request, Response } from "express";

function getActiveSymbolData(req: Request, res: Response) {
  try {
    const symbol = req.body.symbol;
    const timeframe = req.body.interval;

    if (!req.body.symbol || !req.body.interval) {
      res.status(400).json({ msg: "All fields are required" });
      console.log(req.body);
      return;
    }
    if (
      !marketDataManager.marketData[symbol] ||
      !marketDataManager.marketData[symbol][timeframe]
    ) {
      res.status(404).json({ msg: "Pair or interval inactive" });
      return;
    }
    const currSymbolData = marketDataManager.marketData[symbol][timeframe];
    const indicatorData = Object.fromEntries(
      Object.entries(currSymbolData.indicators).map(([key, instance]) => [
        key,
        instance.getAll(),
      ])
    );

    const symbolData = {
      openingTimestamps: currSymbolData.openingTimestamps,
      openPrices: currSymbolData.openPrices,
      highPrices: currSymbolData.highPrices,
      lowPrices: currSymbolData.lowPrices,
      closePrices: currSymbolData.closePrices,
      closingTimestamps: currSymbolData.closingTimestamps,
      indicators: indicatorData,
    };
    res.json(symbolData);
    return;
  } catch (error) {
    res.status(500).json({ msg: "Internal server error" });
  }
}

export default getActiveSymbolData;
