-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('INSTRUKTUR', 'ASISTEN_DOSEN');

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_pelamarId_fkey";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "emailKontak" TEXT,
ADD COLUMN     "gelar" TEXT,
ADD COLUMN     "namaLengkap" TEXT,
ADD COLUMN     "nim" TEXT,
ADD COLUMN     "noWhatsapp" TEXT,
ADD COLUMN     "pernyataan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suratLamaranUrl" TEXT,
ADD COLUMN     "tipe" "ApplicantType",
ALTER COLUMN "pelamarId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_pelamarId_fkey" FOREIGN KEY ("pelamarId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
