-- CreateEnum
CREATE TYPE "EvalType" AS ENUM ('NORMAL', 'SMART');

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timeframe" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rules" DOUBLE PRECISION[],

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "condition" INTEGER NOT NULL,
    "result" INTEGER NOT NULL,
    "evalType" "EvalType" NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "stopPrice" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_symbol_openTime_idx" ON "Signal"("symbol", "openTime");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_symbol_timeframe_openTime_key" ON "Signal"("symbol", "timeframe", "openTime");

-- CreateIndex
CREATE INDEX "Outcome_signalId_condition_idx" ON "Outcome"("signalId", "condition");

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
