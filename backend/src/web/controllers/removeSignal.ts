import { Request, Response } from "express";
import { signalManager } from "../../index";
import logger from "../../utils/logger";
import { cooldownService } from "../../services/cooldownService";

async function removeSignal(req: Request, res: Response) {
  const symbol = req.body.symbol;

  if (!symbol) {
    res.status(400).json({ msg: "Missing parameter 'symbol'" });
    return;
  }
  try {
    const isRemoved = await signalManager.removeSignal(symbol);
    if (isRemoved) {
      cooldownService.checkCooldown(symbol, Date.now());
      res
        .status(200)
        .json({ msg: `Successfully removed the active signal for ${symbol}` });
      return;
    } else {
      res.status(404).json({ msg: `No active signal found for ${symbol}` });
      return;
    }
  } catch (error) {
    logger.error(
      `Error occured while removing signal for ${symbol}. Error: ${error}`
    );
    res.status(500).json({ msg: "Internal server error" });
  }
}

export default removeSignal;
