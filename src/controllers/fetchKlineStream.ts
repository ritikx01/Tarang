import WebSocket from "ws";
import MedianTracker from "../services/medianTracker";
import SymbolTracker from "../services/symbolTracker";

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
    symbolPath.forEach((symbol) => {
      const wsURL = `${WS_URL}/${symbol.toLowerCase()}`;
      const ws = new WebSocket(wsURL);
      let time = this.time;

      ws.on("open", () => {
        console.log("WebSocket connected");
      });

      ws.on("message", (data) => {
        const parsedData = JSON.parse(data.toString());
        // console.log(parsedData)
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
        // if (klineInfo.symbol === "manausdt") {
        //   console.log(
        //     klineInfo.symbol,
        //     "Open:",
        //     klineInfo.open,
        //     "Volume:",
        //     klineInfo.volume,
        //     "Price:",
        //     klineInfo.close,
        //     "Quote:",
        //     klineInfo.quoteVolume,
        //   );
        // }
        if (
          this.symbolData[klineInfo.symbol] !== undefined &&
          this.symbolData[klineInfo.symbol].openTime !== klineInfo.openTime
        ) {
          // if (klineInfo.symbol === "manausdt") {
          //   console.log(
          //     "Mana sent by ws",
          //     this.symbolData[klineInfo.symbol].volume,
          //   );
          // }
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
      });
    });
  }
}
export default FetchKlineStream;
