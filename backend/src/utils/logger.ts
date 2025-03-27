import winston from "winston";
import path from "path";
import { debug } from "console";

const logFilePath = path.join(__dirname, "..", "..", "logs", "app.log");

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);
const printFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level.toUpperCase()}: ${message}\nStack Trace: ${stack}`
      : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    // Console (all levels)
    new winston.transports.Console({ format: printFormat, level: "info" }),

    // Regular logs
    new winston.transports.File({
      filename: logFilePath,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      level: "info", // will log info and above but we'll filter errors out
    }),

    // Error logs (separate file)
    new winston.transports.File({
      filename: path.join(__dirname, "..", "..", "logs", "errors.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      level: "error", // only errors
    }),
  ],
});

export default logger;
