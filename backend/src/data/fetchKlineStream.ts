import WebSocket from "ws";
import MedianTracker from "../services/medianTracker";
import SymbolTracker from "../services/symbolTracker";
import logger from "../utils/logger";

const WS_URL = "wss://fstream.binance.com/ws";

function getSymbolPath(symbols: string[], chunkSize = 200) {
  return Array.from(
    { length: Math.ceil(symbols.length / chunkSize) },
    (_, i) =>
      symbols.slice(i * chunkSize, (i + 1) * chunkSize).join("@kline_5m/") +
      "@kline_5m",
  );
}

interface KlineInfo {
  symbol: string;
  interval: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
}

interface SymbolData {
  [symbol: string]: KlineInfo;
}
class FetchKlineStream {
  private time: number;
  private symbolData: SymbolData;

  constructor(symbols: string[], time: number, symbolTracker: SymbolTracker) {
    this.symbolData = {};
    this.time = time;
    // console.log("Given time:", this.time);
    const symbolPath = getSymbolPath(symbols);
    logger.debug(
      `Successfully created symbol path for timeframe ${time}:\n${symbolPath}`,
    );
    symbolPath.forEach((symbol) => {
      const wsURL = `${WS_URL}/${symbol.toLowerCase()}`;
      const ws = new WebSocket(wsURL);
      let time = this.time;

      ws.on("open", () => {
        logger.info("Connected to binance ws server");
        logger.debug(`For WS URL: ${wsURL}`);
      });

      ws.on("message", (data) => {
        try {
          const parsedData = JSON.parse(data.toString());
          if (!parsedData || !parsedData.k) {
            logger.warn("Recieved unexpected WS message:", parsedData);
          }
          const kline = parsedData.k;

          // Extract Kline information
          const klineInfo: KlineInfo = {
            symbol: kline.s.toLowerCase(),
            interval: kline.i,
            openTime: Number(kline.t),
            open: Number(kline.o),
            high: Number(kline.h),
            low: Number(kline.l),
            close: Number(kline.c),
            volume: Number(kline.v),
            closeTime: Number(kline.T),
            quoteVolume: Number(kline.q),
          };
          if (
            this.symbolData[klineInfo.symbol] !== undefined &&
            this.symbolData[klineInfo.symbol].openTime !== klineInfo.openTime
          ) {
            symbolTracker.addVolume(
              klineInfo.symbol,
              this.symbolData[klineInfo.symbol].volume,
              this.symbolData[klineInfo.symbol].openTime,
              this.symbolData[klineInfo.symbol].closeTime,
              this.symbolData[klineInfo.symbol].open,
              this.symbolData[klineInfo.symbol].close,
              klineInfo.openTime,
            );
            symbolTracker.addEMA(klineInfo.symbol, klineInfo.close);
            this.symbolData[klineInfo.symbol] = klineInfo;
          }
          this.symbolData[klineInfo.symbol] = klineInfo;
        } catch (error) {
          logger.error(`Failed to parse WS message: `, {
            error: error,
            rawData: data.toString(),
          });
        }
      });
      ws.on("close", () => {
        logger.warn(`WebSocket closed`);
        logger.debug(`For: ${wsURL}`);
      });
    });
  }
}
export default FetchKlineStream;
