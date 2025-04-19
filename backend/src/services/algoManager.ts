import { marketDataManager } from "../index";
import logger from "../utils/logger";
import { Timeframe } from "./MarketDataManager";
import VolumeSpikeTracker from "../algorithmicStrats/volumeSpikeTracker";
import aboveEMA from "../algorithmicStrats/aboveEMA";
import { signalManager } from "../index";
import { cooldownService } from "./cooldownService";
import sendToDiscord, { DiscordSignal } from "./sendToDiscord";
import multiplier from "../algorithmicStrats/multiplier";
import atrPriceRatio from "../algorithmicStrats/atrPriceRatio";
import { emaCrossingClose } from "./emaCrossingClose";

export type Algorithm = (data: string, timeframe: Timeframe) => boolean;

class AlgoManager {
  private algorithms: Algorithm[] = [];

  constructor() {
    const volumeSpikeTracker = new VolumeSpikeTracker();
    this.algorithms.push(
      volumeSpikeTracker.VolumeSpikeAlgorithm.bind(volumeSpikeTracker)
    );
    this.algorithms.push(aboveEMA);
    this.algorithms.push(multiplier);
    this.algorithms.push(atrPriceRatio);
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
  public async runAlgorithms(symbol: string, timeframe: Timeframe) {
    if (!marketDataManager.hasData(symbol, timeframe)) {
      logger.error(
        `Error running algorithms for ${symbol} ${timeframe}: No data available`
      );
      return false;
    }
    const algos = this.algorithms.slice();
    const candleData = marketDataManager.getCandleData(symbol, timeframe);
    for (const algo of algos) {
      if (!algo(symbol, timeframe)) {
        logger.debug(
          `Algorithm failed for ${symbol} ${timeframe}, reson: ${algo.name}`
        );
        return false;
      }
      logger.debug(
        `Algorithm passed for ${symbol} ${timeframe}, reason: ${algo.name}`
      );
    }

    if (!cooldownService.checkCooldown(symbol, candleData.closingTimestamp)) {
      return false;
    }
    const discordData: DiscordSignal = {
      symbol,
      price: candleData.closePrice,
      inline: true,
    };
    sendToDiscord.queueSignal(discordData);
    await signalManager.addSignal(
      symbol,
      timeframe,
      marketDataManager.getCandleData(symbol, timeframe)
    );
    logger.info(`All algorithms passed for ${symbol} ${timeframe}`);
    emaCrossingClose.addSignal(symbol);
    return true;
  }
}

export default AlgoManager;
