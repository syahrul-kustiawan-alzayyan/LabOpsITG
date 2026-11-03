-- CreateEnum
CREATE TYPE "MataKuliahStatus" AS ENUM ('AKTIF', 'NONAKTIF');

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "mataKuliahId" TEXT;

-- CreateTable
CREATE TABLE "MataKuliah" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sks" INTEGER NOT NULL DEFAULT 3,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "dosenId" TEXT,
    "instrukturId" TEXT,
    "asistenIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deskripsi" TEXT,
    "status" "MataKuliahStatus" NOT NULL DEFAULT 'AKTIF',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MataKuliah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MataKuliah_kode_key" ON "MataKuliah"("kode");

-- CreateIndex
CREATE INDEX "MataKuliah_status_idx" ON "MataKuliah"("status");

-- CreateIndex
CREATE INDEX "MataKuliah_nama_idx" ON "MataKuliah"("nama");

-- CreateIndex
CREATE INDEX "Schedule_mataKuliahId_idx" ON "Schedule"("mataKuliahId");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataKuliah" ADD CONSTRAINT "MataKuliah_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataKuliah" ADD CONSTRAINT "MataKuliah_instrukturId_fkey" FOREIGN KEY ("instrukturId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
