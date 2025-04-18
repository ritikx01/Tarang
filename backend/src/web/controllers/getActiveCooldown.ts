import { Request, Response } from "express";
import { cooldownService } from "../../services/cooldownService";

function getActiveCooldown(req: Request, res: Response) {
  res.status(200).json({ "active-cooldown": cooldownService.getCooldown() });
  return;
}
export default getActiveCooldown;
