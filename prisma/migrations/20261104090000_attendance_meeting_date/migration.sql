-- DropIndex
DROP INDEX "Attendance_sesiId_userId_key";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sesiId_userId_tanggal_key" ON "Attendance"("sesiId", "userId", "tanggal");
