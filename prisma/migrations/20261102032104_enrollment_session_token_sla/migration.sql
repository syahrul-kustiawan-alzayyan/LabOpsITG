-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionQrToken" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionQrToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassEnrollment_userId_idx" ON "ClassEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_scheduleId_userId_key" ON "ClassEnrollment"("scheduleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionQrToken_token_key" ON "SessionQrToken"("token");

-- CreateIndex
CREATE INDEX "SessionQrToken_scheduleId_expiresAt_idx" ON "SessionQrToken"("scheduleId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionQrToken" ADD CONSTRAINT "SessionQrToken_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
