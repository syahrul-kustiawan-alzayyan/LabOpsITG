-- DropIndex
DROP INDEX "Attendance_sesiId_userId_tanggal_key";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "pertemuanKe" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sesiId_userId_tanggal_pertemuanKe_key" ON "Attendance"("sesiId", "userId", "tanggal", "pertemuanKe");
