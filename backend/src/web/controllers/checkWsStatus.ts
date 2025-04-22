import { Request, Response } from "express";
import { marketDataManager } from "../../index";

async function checkWsStatus(req: Request, res: Response) {
  res.json({
    status: await marketDataManager.fetchklineStream.checkPingStatus(),
  });
  return;
}

export default checkWsStatus;
