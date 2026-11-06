-- CreateEnum
CREATE TYPE "ProdiStatus" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "PeriodeStatus" AS ENUM ('AKTIF', 'NONAKTIF');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'KAPRODI';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "periodeId" TEXT,
ADD COLUMN     "prodiId" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "periodeId" TEXT;

-- AlterTable
ALTER TABLE "MataKuliah" ADD COLUMN     "periodeId" TEXT,
ADD COLUMN     "prodiId" TEXT;

-- AlterTable
ALTER TABLE "RecruitmentPeriod" ADD COLUMN     "periodeId" TEXT,
ADD COLUMN     "prodiId" TEXT;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "periodeId" TEXT,
ADD COLUMN     "prodiId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "prodiId" TEXT;

-- CreateTable
CREATE TABLE "Prodi" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" "ProdiStatus" NOT NULL DEFAULT 'AKTIF',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kaprodiId" TEXT,

    CONSTRAINT "Prodi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periode" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "status" "PeriodeStatus" NOT NULL DEFAULT 'AKTIF',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Periode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prodi_kode_key" ON "Prodi"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Prodi_kaprodiId_key" ON "Prodi"("kaprodiId");

-- CreateIndex
CREATE INDEX "Prodi_kode_idx" ON "Prodi"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Periode_kode_key" ON "Periode"("kode");

-- CreateIndex
CREATE INDEX "Periode_kode_idx" ON "Periode"("kode");

-- CreateIndex
CREATE INDEX "Periode_isCurrent_idx" ON "Periode"("isCurrent");

-- CreateIndex
CREATE INDEX "Attendance_prodiId_idx" ON "Attendance"("prodiId");

-- CreateIndex
CREATE INDEX "Attendance_periodeId_idx" ON "Attendance"("periodeId");

-- CreateIndex
CREATE INDEX "Booking_periodeId_idx" ON "Booking"("periodeId");

-- CreateIndex
CREATE INDEX "MataKuliah_prodiId_idx" ON "MataKuliah"("prodiId");

-- CreateIndex
CREATE INDEX "Schedule_prodiId_idx" ON "Schedule"("prodiId");

-- CreateIndex
CREATE INDEX "Schedule_periodeId_idx" ON "Schedule"("periodeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prodi" ADD CONSTRAINT "Prodi_kaprodiId_fkey" FOREIGN KEY ("kaprodiId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataKuliah" ADD CONSTRAINT "MataKuliah_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataKuliah" ADD CONSTRAINT "MataKuliah_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentPeriod" ADD CONSTRAINT "RecruitmentPeriod_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "Prodi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentPeriod" ADD CONSTRAINT "RecruitmentPeriod_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
