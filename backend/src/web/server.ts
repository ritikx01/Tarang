import express from "express";
import dotenv from "dotenv";
import apiRouter from "./routes/api";
import cookieParser from "cookie-parser";
import { corsMiddleware } from "./middlewares/cors";

export function createServer() {
  dotenv.config();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(corsMiddleware);
  const PORT: number = Number(process.env.PORT) || 3000;
  const HOSTNAME: string = process.env.HOSTNAME || "127.0.0.1";

  app.use("/api", apiRouter);

  return { app, PORT, HOSTNAME };
}
