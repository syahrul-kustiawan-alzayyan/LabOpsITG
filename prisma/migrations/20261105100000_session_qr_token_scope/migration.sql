-- Ruang lingkup token QR per sesi absensi (tanggal + pertemuan)
ALTER TABLE "SessionQrToken"
  ADD COLUMN "tanggal" TIMESTAMP(3),
  ADD COLUMN "pertemuanKe" INTEGER;
