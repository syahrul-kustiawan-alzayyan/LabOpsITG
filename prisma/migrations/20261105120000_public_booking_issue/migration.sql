-- Peminjaman dan pelaporan kendala dapat dikirim tanpa akun (publik).
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_peminjamId_fkey";

ALTER TABLE "Booking"
ADD COLUMN "kodePengajuan" TEXT,
ADD COLUMN "namaPeminjam" TEXT,
ADD COLUMN "emailPeminjam" TEXT,
ADD COLUMN "noWhatsapp" TEXT,
ADD COLUMN "nim" TEXT,
ALTER COLUMN "peminjamId" DROP NOT NULL;

CREATE UNIQUE INDEX "Booking_kodePengajuan_key" ON "Booking"("kodePengajuan");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_peminjamId_fkey" FOREIGN KEY ("peminjamId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Issue" DROP CONSTRAINT "Issue_pelaporId_fkey";

ALTER TABLE "Issue"
ADD COLUMN "namaPelapor" TEXT,
ADD COLUMN "emailPelapor" TEXT,
ADD COLUMN "noWhatsapp" TEXT,
ADD COLUMN "nim" TEXT,
ALTER COLUMN "pelaporId" DROP NOT NULL;

ALTER TABLE "Issue" ADD CONSTRAINT "Issue_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
