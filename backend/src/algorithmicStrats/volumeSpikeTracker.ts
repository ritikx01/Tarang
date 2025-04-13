import { Timeframe } from "../services/MarketDataManager";
import { marketDataManager } from "../index";
import logger from "../utils/logger";

const timeframeToMs: Record<Timeframe, number> = {
  "1m": 1 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 1 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  D: 1 * 24 * 60 * 60 * 1000,
  W: 7 * 24 * 60 * 60 * 1000,
};
type PreviousSpikes = Record<string, Partial<Record<Timeframe, number[]>>>; // {symbol: {timeframe: [candleTime1, candleTime2, ...]}}

class VolumeSpikeTracker {
  private spikeCount: number;
  private spikeThreshold: number;
  private previousSpikes: PreviousSpikes;

  constructor(spikeThreshold: number = 3, spikeCount: number = 3) {
    this.spikeThreshold = spikeThreshold;
    this.spikeCount = spikeCount;
    this.previousSpikes = {};
  }

  public VolumeSpikeAlgorithm(symbol: string, timeframe: Timeframe) {
    if (marketDataManager.hasData(symbol, timeframe)) {
      const candleVolume =
        marketDataManager.marketData[symbol][timeframe].volumes.at(-1);
      const candleTime =
        marketDataManager.marketData[symbol][timeframe].closingTimestamps.at(
          -1
        );

      if (!candleVolume || !candleTime) {
        logger.debug(
          `Incomplete market data for ${symbol} ${timeframe}. Candle volume: ${candleVolume}, Candle time: ${candleTime}`
        );
        return false;
      }

      const medianVolume =
        marketDataManager.marketData[symbol][
          timeframe
        ].indicators.medianData.getValue();

      if (medianVolume * this.spikeThreshold <= candleVolume) {
        if (!this.previousSpikes[symbol]) {
          this.previousSpikes[symbol] = {};
        }

        if (!this.previousSpikes[symbol][timeframe]) {
          this.previousSpikes[symbol][timeframe] = [];
        }
        const timeframeSpikes = this.previousSpikes[symbol][timeframe];

        // Adjust only when timeframeSpikes is not empty
        if (timeframeSpikes.length > 0) {
          // Null coeslscing fallback even if this is checked in the if condition
          // Fallback to current time, so difference is 0 hence no adjustments
          const prevSpikeCandleTime = timeframeSpikes.at(-1) ?? candleTime;
          // Incase adjustment value goes below 0, set it to 0
          const adjustSpikeCandleTime = Math.max(
            Math.floor(
              (candleTime - prevSpikeCandleTime) / timeframeToMs[timeframe]
            ) - 1,
            0
          );
          timeframeSpikes.splice(0, adjustSpikeCandleTime);
        }

        timeframeSpikes.push(candleTime);
        if (timeframeSpikes.length > this.spikeCount) {
          timeframeSpikes.shift();
        }
        if (timeframeSpikes.length === this.spikeCount) {
          logger.debug(`Volume spike passed for ${symbol} ${timeframe}`);
          return true;
        }
        logger.debug(
          `Volume spike failed for ${symbol} ${timeframe}. Spike count ${timeframeSpikes.length}`
        );
      } else {
        logger.debug(
          `Volume spike failed for ${symbol} ${timeframe}. Candle volume: ${candleVolume}, Median volume: ${medianVolume}`
        );
      }
    } else {
      logger.warn(`No data available for ${symbol} ${timeframe}`);
      return false;
    }

    return false;
  }
}

export default VolumeSpikeTracker;
