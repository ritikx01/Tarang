import { prisma } from "../index";
import logger from "./logger";

async function checkDBConnection(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("✅ Connected to the database");
  } catch (err) {
    logger.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  }
}

export default checkDBConnection;
