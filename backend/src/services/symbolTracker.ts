import { broadcast } from "../index";
import { BroadcastMessage } from "./broadcast";
import { sendToDiscord } from "./sendToDiscord";
import MedianTracker from "./medianTracker";

interface VolumeData {
  volumes: number[];
  timeFrame: string;
  median: MedianTracker;
}

interface VolumeDataAll {
  [symbol: string]: VolumeData;
}
interface Signal {
  strength: number;
  closingTime: number;
}
interface Signals {
  [symbol: string]: Signal;
}
interface EMA {
  "9"?: number;
  "15"?: number;
  "100"?: number;
}
interface EMAData {
  [symbol: string]: EMA;
}

export interface DiscordSignal {
  name: string;
  value: string;
  inline: boolean;
}

const EXCHANGE_BASE_URL = "https://www.binance.com/en/futures";

class SymbolTracker {
  private volumeData: VolumeDataAll;
  public lastOpenTime: number;
  private signals: Signals;
  private groupSignals: DiscordSignal[];
  private emaData: EMAData = {};

  constructor(openTime: number) {
    this.lastOpenTime = openTime;
    this.volumeData = {};
    this.groupSignals = [];
    this.signals = {};
    this.startAutoSend();
    broadcast.broadcast({
      symbol: "BTCUSDT",
      signalType: true,
      price: 99000, // Closing Price
      timestamp: 1733678399000,
      timeframe: "5m",
      chartLink: "CHART",
      exchangeLink: "EXCHANGE",
      seen: true,
      strength: 2,
    });
    console.log("Sent to WS");
  }
  public initEMA(symbol: string, closingPrices: number[]) {
    const periods = [9, 15, 100];
    for (const period of periods) {
      let new_ema = closingPrices.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (const price of closingPrices.slice(period)){
        const prevEMA = new_ema
        const multiplier = 2 / (period + 1);
        new_ema = (price - prevEMA) * multiplier + prevEMA;
      }
    
      if (!this.emaData[symbol]) {
        this.emaData[symbol] = {};
      }
      this.emaData[symbol][String(period) as keyof EMA] = new_ema;
    }
  }

  public addEMA(symbol: string, price: number) {
    const periods = [9, 15, 100];
    for (const period of periods) {
      const prevEMA = this.emaData[symbol][String(period) as keyof EMA] || price;
      const multiplier = 2 / (period + 1);
      const new_ema = (price - prevEMA) * multiplier + prevEMA;
      this.emaData[symbol][String(period) as keyof EMA] = new_ema;
    }
  }
  public createMedian(symbol: string, volumes: number[], timeFrame = "5m") {
    this.volumeData[symbol] = {
      volumes: volumes,
      timeFrame: timeFrame,
      median: new MedianTracker(volumes.slice(-72)),
    };
    if (symbol === "manausdt") {
      // console.log(symbol, " init:", this.getMedian(symbol));
      // console.table(this.volumeData[symbol].volumes);
    }
    return this.getMedian(symbol);
  }

  public getMedian(symbol: string) {
    return this.volumeData[symbol].median.getMedian();
  }
  private calculateTimeDiff(oldUnixTimeInMs: number, newUnixTimeInMs: number) {
    const differenceMs = newUnixTimeInMs - oldUnixTimeInMs;
    const fiveMinutePeriods = Math.floor(differenceMs / (5 * 60 * 1000));
    return fiveMinutePeriods;
  }

  private sendSignal(
    symbol: string,
    volume: number,
    openingPrice: number,
    closingPrice: number,
    closingTime: number,
    timestamp: number, // New Open Time
    timeframe = "5m"
  ) {
    let newStrength;
    if (this.signals[symbol] !== undefined) {
      const pair = this.signals[symbol];
      console.log(
        "Symbol",
        symbol,
        "Old:",
        pair.strength,
        "Reduce strength:",
        this.calculateTimeDiff(pair.closingTime, closingTime),
        `Timing old: ${pair.closingTime} new: ${closingTime}`
      );
      newStrength = Math.max(
        0,
        pair.strength -
          this.calculateTimeDiff(pair.closingTime, closingTime) +
          1
      );
      newStrength += 1;
    } else {
      newStrength = 1;
    }
    newStrength = Math.min(newStrength, 3);
    this.signals[symbol] = { strength: newStrength, closingTime };
    const exchangeLink = `${EXCHANGE_BASE_URL}/${symbol}`;
    const message: BroadcastMessage = {
      symbol,
      signalType: true,
      price: closingPrice,
      timestamp,
      timeframe,
      chartLink: "",
      exchangeLink,
      seen: false,
      strength: newStrength,
    };
    this.signals[symbol] = { strength: newStrength, closingTime };
    // console.log("For ws", message);
    if (this.emaData[symbol]["100"]) {
    const aboveEMA = true ? this.emaData[symbol]["100"] < closingPrice : false;
    console.log("Above EMA",symbol, aboveEMA, this.emaData[symbol]["100"], closingPrice);
    if (newStrength >= 3 && aboveEMA) {
      console.log(message);
      broadcast.broadcast(message);
      this.storeData(symbol, closingPrice, newStrength);
    }
  }
  }

  private storeData(symbol: string, price: number, strength: number) {
    console.log(
      `Buy **${symbol}** at **${price}**.\n**Strength:** ${strength}`
    );
    this.groupSignals.push({
      name: `**[${symbol}](${EXCHANGE_BASE_URL}/${symbol})**`,
      value: `Buy **${symbol}** at **${price}**.\n**Strength:** ${strength}`,
      inline: false,
    });
  }

  // Periodic sender with atomic array swap
  startAutoSend() {
    setInterval(() => {
      if (this.groupSignals.length > 0) {
        sendToDiscord(this.groupSignals); // Process the data
        this.groupSignals = []; // Replace with a new array atomically
      }
    }, 5000);
  }

  public addVolume(
    symbol: string,
    volume: number,
    time: number, // Previous open time (for updation)
    closingTime: number,
    openingPrice: number,
    closingPrice: number,
    timestamp: number, // New open time
    timeframe = "5m"
  ) {
    if (volume === 0) {
      return;
    }
    const curr_median = this.getMedian(symbol) ?? openingPrice;
    // Check if candle is bullish or bearish
    //if (curr_median * 3.5 <= volume && closingPrice > openingPrice) {
    if (curr_median * 3.5 <= volume) {
      // console.log(
      //   `BUY ${symbol}, Median:${curr_median}, Volume:${volume}, Open: ${openingPrice}, Close: ${closingPrice}`,
      // );
      this.sendSignal(
        symbol,
        volume,
        openingPrice,
        closingPrice,
        closingTime,
        timestamp,
        timeframe
      );
    }
    try {
      try {
        this.volumeData[symbol].median.remove(
          this.volumeData[symbol].volumes[0]
        );
      } catch (e) {
        console.log("Median Remove error", e);
      }
      this.volumeData[symbol].volumes.shift();
    } catch (e) {
      console.log(
        "Error adding volume, please create median first for:",
        symbol
      );
      // console.table(this.volumeData);
    }
    this.volumeData[symbol].volumes.push(volume);
    this.volumeData[symbol].median.add(volume);
    this.lastOpenTime = time;
    if (symbol === "manausdt") {
      // console.log("manauSDT new:", this.getMedian(symbol), "Vol:", volume);
      // console.table(this.volumeData[symbol].volumes);
    }
    return this.getMedian(symbol);
  }
}

export default SymbolTracker;
