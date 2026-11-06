-- AlterTable
ALTER TABLE "Lab" ADD COLUMN     "periodeId" TEXT;

-- AddForeignKey
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
