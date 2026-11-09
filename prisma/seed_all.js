/**
 * Orkestrator seed data LabOps.
 *
 * Menjalankan seluruh tahapan secara berurutan dalam satu perintah:
 *   1. seed_full.js           — lab, dosen, jadwal, mahasiswa, enrollment,
 *                                inventaris, peminjaman, kendala, rekrutmen
 *   2. backfill_mata_kuliah.js — turunan tabel MataKuliah dari jadwal
 *   3. seed.prodi-periode.js   — prodi, periode akademik, akun kaprodi
 *   4. seed_personel.js        — instruktur, asisten dosen, penugasan mata kuliah
 *
 * Tahapan 2 wajib setelah tahap 1 karena MataKuliah diturunkan dari Schedule.
 * Tahapan 4 wajib setelah tahap 2 karena penugasan personel menunjuk MataKuliah.
 *
 * Jalankan: node prisma/seed_all.js
 */
const { execFileSync } = require("child_process");
const path = require("path");

const STEPS = [
  { file: "seed_full.js", label: "Data inti (lab, jadwal, mahasiswa, inventaris)" },
  { file: "backfill_mata_kuliah.js", label: "Mata kuliah dari jadwal" },
  { file: "seed.prodi-periode.js", label: "Prodi, periode akademik, akun kaprodi" },
  { file: "seed_personel.js", label: "Instruktur, asisten dosen, penugasan" },
];

function runStep(step) {
  console.log(`\n=== ${step.label} (${step.file}) ===`);
  const script = path.join(__dirname, step.file);
  execFileSync(process.execPath, [script], {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
}

function main() {
  for (const step of STEPS) {
    try {
      runStep(step);
    } catch (err) {
      console.error(`\nSeed gagal pada tahap: ${step.file}`);
      console.error(err.stderr ? err.stderr.toString() : err.message);
      process.exit(1);
    }
  }
  console.log("\nSeed selesai. Akun demo: admin/koordinator/dosen/mahasiswa/instruktur/kaprodi.");
}

main();
