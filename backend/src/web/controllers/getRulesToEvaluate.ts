import { Request, Response } from "express";
import { signalManager } from "../..";

function getRulesToEvaluate(req: Request, res: Response) {
  const rulesToEvaluate = signalManager.getrulesToEvaluate();
  res.status(200).json({ "evaluation-rules": rulesToEvaluate });
  return;
}

export default getRulesToEvaluate;
