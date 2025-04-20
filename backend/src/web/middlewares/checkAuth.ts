import { getUser } from "../services/jwt";
import { Request, Response, NextFunction } from "express";

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUser(req.cookies?.sessionID);
  if (user === undefined) {
    res.status(401).json({ msg: "Please login to continue" });
    return;
  }
  next();
}
