-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedBy" TEXT,
ADD COLUMN     "validationSource" TEXT;
