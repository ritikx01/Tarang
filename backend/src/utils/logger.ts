import winston from "winston";
import path from "path";

const logFilePath = path.join(__dirname, "..", "..", "logs", "app.log");

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);
const printFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level.toUpperCase()}: ${message}\nStack Trace: ${stack}`
      : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }),
);

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new winston.transports.Console({ format: printFormat }),
    new winston.transports.File({
      filename: logFilePath,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export default logger;
