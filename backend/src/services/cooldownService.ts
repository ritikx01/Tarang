import logger from "../utils/logger";

class CooldownService {
  private cooldownStore: Map<string, number> = new Map();
  private cooldownDuration: number;
  constructor(cooldownDuration?: number) {
    this.cooldownDuration = cooldownDuration || 2 * 60 * 60 * 1000; // Default to 2 hours
  }

  public checkCooldown(symbol: string, closingTimestamp: number): boolean {
    const lastTimestamp = this.cooldownStore.get(symbol);
    const isAllowed =
      !lastTimestamp ||
      closingTimestamp - lastTimestamp >= this.cooldownDuration;

    if (!isAllowed) {
      logger.debug(
        `Cooldown active for ${symbol}. Last: ${lastTimestamp}, Now: ${closingTimestamp}`
      );
    }

    this.cooldownStore.set(symbol, closingTimestamp);
    return isAllowed;
  }
  public getCooldown() {
    return this.cooldownStore;
  }
}

export const cooldownService = new CooldownService();
