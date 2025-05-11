import WebSocket from "ws";
import logger from "../utils/logger";
import { marketDataManager } from "..";
import { AddCandleData } from "../services/MarketDataManager";
import { Timeframe } from "../services/MarketDataManager";
import { signalManager } from "../index";
import * as schedule from "node-schedule";

const WS_URL = "wss://fstream.binance.com/ws";

function getSymbolPath(
  symbols: string[],
  timeframe: Timeframe,
  chunkSize = 200
) {
  return Array.from(
    { length: Math.ceil(symbols.length / chunkSize) },
    (_, i) =>
      symbols
        .slice(i * chunkSize, (i + 1) * chunkSize)
        .join(`@kline_${timeframe}/`) + `@kline_${timeframe}`
  );
}

interface KlineInfo {
  symbol: string;
  interval: Timeframe;
  openingTimestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closingTimestamp: number;
  quoteVolume: number;
  isClosed: boolean;
}

// To-do Use global timeout manager from MarketDataManager class instead of a local storage
class FetchKlineStream {
  private reconnectAttempts: Map<string, number> = new Map();
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAY_BASE = 1000;
  private websockets: Map<string, WebSocket> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private cleanupJob: schedule.Job | null = null;

  // Consider implementing cleanupJob cancellation method
  constructor() {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 0;
    rule.minute = 1;
    rule.tz = "Etc/UTC";
    this.cleanupJob = schedule.scheduleJob(rule, () => this.executeCleanup());
  }

  // Check for race condition between cleanup and ws reconnection
  private async executeCleanup() {
    try {
      this.clearAllReconnectTimeouts();
      logger.info("Cleared all reconnection timeouts");

      logger.info("Starting websocket cleanup.");
      this.cleanup();
      await marketDataManager.cleanMarketDataManager();
    } catch (error) {
      logger.error("Error during websocket cleanup:", error);
    }
  }

  public async initWebsocket(symbols: string[], timeframes: Timeframe[]) {
    for (const timeframe of timeframes) {
      const symbolPaths = getSymbolPath(symbols, timeframe);
      logger.debug(
        `Successfully created symbol path for timeframe ${timeframe}:\n${symbolPaths}`
      );
      symbolPaths.forEach((symbolPath) => {
        this.connect(symbolPath);
      });
    }
  }

  private async connect(symbolPath: string) {
    const wsURL = `${WS_URL}/${symbolPath.toLowerCase()}`;
    const ws = new WebSocket(wsURL);
    let reconnectAttempts = this.reconnectAttempts.get(symbolPath) || 0;

    this.websockets.set(symbolPath, ws);

    ws.on("open", () => {
      logger.info("Connected to binance ws server");
      logger.info(`For WS URL: ${wsURL}`);
      reconnectAttempts = 0;
      this.reconnectAttempts.set(symbolPath, reconnectAttempts);
    });

    ws.on("message", (data) => {
      try {
        const parsedData = JSON.parse(data.toString());
        if (!parsedData || !parsedData.k) {
          logger.warn("Recieved unexpected WS message:", parsedData);
        }
        const kline = parsedData.k;

        const klineInfo: KlineInfo = {
          symbol: kline.s.toLowerCase(),
          interval: kline.i,
          openingTimestamp: Number(kline.t),
          open: Number(kline.o),
          high: Number(kline.h),
          low: Number(kline.l),
          close: Number(kline.c),
          volume: Number(kline.v),
          closingTimestamp: Number(kline.T),
          quoteVolume: Number(kline.q),
          isClosed: kline.x,
        };
        const candleData: AddCandleData = {
          openingTimestamp: klineInfo.openingTimestamp,
          openPrice: klineInfo.open,
          highPrice: klineInfo.high,
          lowPrice: klineInfo.low,
          closePrice: klineInfo.close,
          volume: klineInfo.volume,
          closingTimestamp: klineInfo.closingTimestamp,
        };
        signalManager.updateSignals(
          klineInfo.symbol,
          klineInfo.interval,
          candleData
        );
        if (klineInfo.isClosed) {
          try {
            marketDataManager.addCandleData(
              klineInfo.symbol,
              klineInfo.interval,
              candleData
            );
          } catch (error) {
            logger.error(
              `Failed to add candle data for ${klineInfo.symbol}:`,
              error
            );
          }
        }
      } catch (error) {
        logger.error(`Failed to parse WS message: `, {
          error: error,
          rawData: data.toString(),
        });
      }
    });

    ws.on("close", (code, reason) => {
      logger.warn({
        message: `WebSocket closed for ${symbolPath.slice(0, 20)}`,
        code,
        reason: reason.toString(),
        wasClean: code === 1000 || code === 1001,
      });
      try {
        ws.terminate();
        logger.info(`Closed WebSocket connection for ${symbolPath}`);
      } catch (error) {
        logger.error(`Failed to close WebSocket for ${symbolPath}:`, error);
      }
      this.websockets.delete(symbolPath);
      this.scheduleReconnect(symbolPath);
    });

    ws.on("error", (err) => {
      logger.error(`WebSocket error for ${symbolPath}: ${err.message}`);
      try {
        ws.terminate();
        logger.info(`Closed WebSocket connection for ${symbolPath}`);
      } catch (error) {
        logger.error(`Failed to close WebSocket for ${symbolPath}:`, error);
      }
      this.websockets.delete(symbolPath);
      this.scheduleReconnect(symbolPath);
    });
  }
  private async scheduleReconnect(symbolPath: string) {
    let reconnectAttempts = this.reconnectAttempts.get(symbolPath) || 0;

    if (
      FetchKlineStream.MAX_RECONNECT_ATTEMPTS &&
      reconnectAttempts >= FetchKlineStream.MAX_RECONNECT_ATTEMPTS
    ) {
      logger.error(
        `Max reconnection attempts reached for ${symbolPath}. Giving up.`
      );
      this.reconnectAttempts.delete(symbolPath);

      clearTimeout(this.reconnectTimeouts.get(symbolPath));
      this.reconnectTimeouts.delete(symbolPath);
      return;
    }

    reconnectAttempts++;
    this.reconnectAttempts.set(symbolPath, reconnectAttempts);

    const delay =
      FetchKlineStream.RECONNECT_DELAY_BASE *
      Math.pow(2, reconnectAttempts - 1);
    logger.info(
      `Reconnecting to ${symbolPath} in ${delay}ms (attempt ${reconnectAttempts})`
    );

    const timeout = setTimeout(() => {
      this.connect(symbolPath);
    }, delay);
    logger.debug(
      `Scheduled reconnection for ${symbolPath} with delay ${delay}ms`
    );
    this.reconnectTimeouts.set(symbolPath, timeout);
  }

  private closeAllWebsockets() {
    for (const [symbolPath, ws] of this.websockets.entries()) {
      try {
        ws.terminate();
        logger.info(`Closed WebSocket connection for ${symbolPath}`);
      } catch (error) {
        logger.error(`Failed to close WebSocket for ${symbolPath}:`, error);
      }
    }
    this.websockets.clear();
  }

  private clearAllReconnectTimeouts() {
    for (const [symbolPath, timeout] of this.reconnectTimeouts.entries()) {
      clearTimeout(timeout);
      logger.debug(`Cleared reconnection timeout for ${symbolPath}`);
    }
    this.reconnectTimeouts.clear();
  }

  private cleanup() {
    logger.debug("Cleaning up FetchKlineStream...");

    this.clearAllReconnectTimeouts();
    logger.debug("Cleared all reconnection timeouts.");

    this.reconnectAttempts.clear();
    logger.debug("Cleared all reconnection attempts.");

    this.closeAllWebsockets();
    logger.debug("Closed and cleaned up all WebSocket connections.");
  }

  // Potential memory leaks in pong handlers, consider using a setTimeout to clear
  public async checkPingStatus(
    timeout = 3000
  ): Promise<
    { key: string; url: string; status: "responsive" | "unresponsive" }[]
  > {
    const checks: Promise<{
      key: string;
      url: string;
      status: "responsive" | "unresponsive";
    }>[] = [];

    for (const [key, ws] of this.websockets.entries()) {
      const url = ws.url;

      const pingPromise = new Promise<{
        key: string;
        url: string;
        status: "responsive" | "unresponsive";
      }>((resolve) => {
        let responded = false;

        const handlePong = () => {
          responded = true;
          resolve({ key, url, status: "responsive" });
          ws.off("pong", handlePong);
        };

        ws.on("pong", handlePong);

        try {
          ws.ping();
        } catch (err) {
          resolve({ key, url, status: "unresponsive" });
          return;
        }

        setTimeout(() => {
          if (!responded) {
            ws.off("pong", handlePong);
            resolve({ key, url, status: "unresponsive" });
          }
        }, timeout);
      });

      checks.push(pingPromise);
    }

    return Promise.all(checks);
  }
}
export default FetchKlineStream;
