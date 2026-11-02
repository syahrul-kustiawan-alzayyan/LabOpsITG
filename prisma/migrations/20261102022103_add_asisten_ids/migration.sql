-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "asistenIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
