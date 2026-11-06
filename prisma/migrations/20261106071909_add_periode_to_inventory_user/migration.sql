-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "periodeId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "periodeId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
