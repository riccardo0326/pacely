-- CreateTable
CREATE TABLE "PerformanceMetricSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ctl" DOUBLE PRECISION NOT NULL,
    "atl" DOUBLE PRECISION NOT NULL,
    "tsb" DOUBLE PRECISION NOT NULL,
    "ftp" DOUBLE PRECISION,
    "vdot" DOUBLE PRECISION,
    "swimThresholdPaceSecPer100m" DOUBLE PRECISION,
    "sportBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceMetricSnapshot_userId_date_idx" ON "PerformanceMetricSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceMetricSnapshot_userId_date_key" ON "PerformanceMetricSnapshot"("userId", "date");

-- AddForeignKey
ALTER TABLE "PerformanceMetricSnapshot" ADD CONSTRAINT "PerformanceMetricSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
