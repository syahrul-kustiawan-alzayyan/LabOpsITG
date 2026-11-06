-- Sinkronkan pengampu sesi praktikum dengan instruktur mata kuliah.
-- Sebelumnya kolom pengampuId diisi dosen pengampu, sehingga "Jadwal saya"
-- milik instruktur selalu kosong dan sesi tidak terhubung ke instruktur.
UPDATE "Schedule" s
SET "pengampuId" = mk."instrukturId"
FROM "MataKuliah" mk
WHERE s."mataKuliahId" = mk."id"
  AND mk."instrukturId" IS NOT NULL
  AND s."deletedAt" IS NULL;
