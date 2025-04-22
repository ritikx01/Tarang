import WebSocket from "ws";
import logger from "../utils/logger";
import { Mutex } from "async-mutex";
import { marketDataManager } from "..";
import { AddCandleData } from "../services/MarketDataManager";
import { Timeframe } from "../services/MarketDataManager";
import { signalManager } from "../index";

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
  private activeConnections = 0;
  // Remove mutex lock by storing all ws instances in an array
  private mutex = new Mutex();
  private reconnectAttempts: Map<string, number> = new Map();
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAY_BASE = 1000;
  private websockets: Map<string, WebSocket> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {}
  public async registerConnection() {
    const release = await this.mutex.acquire();
    this.activeConnections++;
    release();
  }

  public async handleDisconnection() {
    const release = await this.mutex.acquire();
    try {
      this.activeConnections--;
      if (this.activeConnections === 0) {
        logger.info("All connections closed.");
        this.cleanup();
        marketDataManager.cleanMarketDataManager();
      }
    } finally {
      release();
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
      this.registerConnection();
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

    // Add a retry logic if the disconnect is not the 24 hour disconnect
    // Graceful disconnect might not pe periodic 24h
    // Disconnnect might be due to binance server maintainance
    ws.on("close", () => {
      logger.warn(`WebSocket closed`);
      logger.debug(`For: ${wsURL}`);
      this.websockets.delete(symbolPath);
      this.handleDisconnection();
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

      await this.handleDisconnection();
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

    this.activeConnections = 0;
    logger.debug("Reset activeConnections to 0.");

    this.reconnectAttempts.clear();
    logger.debug("Cleared all reconnection attempts.");

    this.clearAllReconnectTimeouts();

    this.closeAllWebsockets();
    logger.debug("Closed and cleaned up all WebSocket connections.");
  }

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
