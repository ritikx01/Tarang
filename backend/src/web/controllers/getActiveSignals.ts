import { Request, Response } from "express";
import { emaCrossingClose } from "../../services/emaCrossingClose";

function getActiveSingals(req: Request, res: Response) {
  const activeSignals = emaCrossingClose.getActiveSignals();
  res.status(200).json({ "active-signals": activeSignals });
  return;
}

export default getActiveSingals;
