import { broadcast } from "../index";
import { marketDataManager } from "../index";
import logger from "../utils/logger";
import { Timeframe } from "./MarketDataManager";
import VolumeSpikeTracker from "../algorithmicStrats/volumeSpikeTracker";
import aboveEMA from "../algorithmicStrats/aboveEMA";

export type Algorithm = (data: string, timeframe: Timeframe) => boolean;

class AlgoManager {
  private algorithms: Algorithm[] = [];

  constructor() {
    const volumeSpikeTracker = new VolumeSpikeTracker();
    this.algorithms.push(
      volumeSpikeTracker.VolumeSpikeAlgorithm.bind(volumeSpikeTracker)
    );
    this.algorithms.push(aboveEMA);
  }

  public registerAlgorithm(algo: Algorithm) {
    this.algorithms.push(algo);
  }

  public removeAlgorithm(algo: Algorithm) {
    const idx = this.algorithms.indexOf(algo);
    if (idx !== -1) {
      this.algorithms.splice(idx, 1);
    }
  }

  // runAlgoithms should store the symbol data and pass it to the algorithms. Current method might not be feasible for
  // timeframes smaller than 1m
  // Candle could get closed before processing all algorithms making the signal obsolete
  public runAlgorithms(symbol: string, timeframe: Timeframe) {
    if (!marketDataManager.hasData(symbol, timeframe)) {
      logger.error(
        `Error running algorithms for ${symbol} ${timeframe}: No data available`
      );
      return false;
    }
    const algos = this.algorithms.slice();
    for (const algo of algos) {
      if (!algo(symbol, timeframe)) {
        logger.debug(
          `Algorithm failed for ${symbol} ${timeframe}, reson: ${algo.name}`
        );
        return false;
      }
      logger.debug(
        `Algorithm passed for ${symbol} ${timeframe}, reson: ${algo.name}`
      );
    }
    logger.info(`All algorithms passed for ${symbol} ${timeframe}`);
    return true;
  }
}

export default AlgoManager;
