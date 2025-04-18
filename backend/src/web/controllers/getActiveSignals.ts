import { Request, Response } from "express";
import { signalManager } from "../../index";

function getActiveSingals(req: Request, res: Response) {
  const activeSignals = signalManager.getActiveSignals();
  res.status(200).json({ "active-signals": activeSignals });
  return;
}

export default getActiveSingals;
