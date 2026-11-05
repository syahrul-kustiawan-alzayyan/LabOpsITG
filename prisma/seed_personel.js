/**
 * Seed data dummy instruktur & asisten dosen per mata kuliah.
 *
 * - 7 instruktur dan 14 asisten dosen (role USER, sub-role INSTRUKTUR / ASISTEN_DOSEN)
 * - Setiap mata kuliah mendapat 1 instruktur + 2 asisten dosen (rotasi)
 * - Schedule milik mata kuliah ikut disinkronkan asistenIds-nya
 *
 * Jalankan: node prisma/seed_personel.js
 * Login instruktur (username / kata sandi):
 *   instruktur01 / aditya123    instruktur05 / dimas123
 *   instruktur02 / rani123      instruktur06 / nadia123
 *   instruktur03 / bayu123      instruktur07 / fajar123
 *   instruktur04 / siti123
 * Login asisten  : asisten01@labops.local / asisten123
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://labops:labops@localhost:5433/labops?schema=public";

const prisma = new PrismaClient();

const INSTRUKTUR = [
  { nama: "Aditya Pratama, M.Kom.", email: "instruktur01@labops.local", username: "instruktur01", password: "aditya123" },
  { nama: "Rani Puspitasari, M.Kom.", email: "instruktur02@labops.local", username: "instruktur02", password: "rani123" },
  { nama: "Bayu Nugroho, M.T.", email: "instruktur03@labops.local", username: "instruktur03", password: "bayu123" },
  { nama: "Siti Fadhilah, M.Kom.", email: "instruktur04@labops.local", username: "instruktur04", password: "siti123" },
  { nama: "Dimas Ramadhan, M.Kom.", email: "instruktur05@labops.local", username: "instruktur05", password: "dimas123" },
  { nama: "Nadia Rahmawati, M.T.", email: "instruktur06@labops.local", username: "instruktur06", password: "nadia123" },
  { nama: "Fajar Setiawan, M.Kom.", email: "instruktur07@labops.local", username: "instruktur07", password: "fajar123" },
];

const ASISTEN = [
  { nama: "Ahmad Rifqi", email: "asisten01@labops.local" },
  { nama: "Bella Anjani", email: "asisten02@labops.local" },
  { nama: "Chandra Wijaya", email: "asisten03@labops.local" },
  { nama: "Dinda Larasati", email: "asisten04@labops.local" },
  { nama: "Eko Saputra", email: "asisten05@labops.local" },
  { nama: "Farah Nabila", email: "asisten06@labops.local" },
  { nama: "Gilang Ramadhan", email: "asisten07@labops.local" },
  { nama: "Hana Maulida", email: "asisten08@labops.local" },
  { nama: "Ilham Firmansyah", email: "asisten09@labops.local" },
  { nama: "Jihan Aulia", email: "asisten10@labops.local" },
  { nama: "Kevin Halim", email: "asisten11@labops.local" },
  { nama: "Lestari Wulandari", email: "asisten12@labops.local" },
  { nama: "Miftah Rizki", email: "asisten13@labops.local" },
  { nama: "Nabila Putri", email: "asisten14@labops.local" },
];

async function upsertPersonel(list, role, defaultPassword) {
  const users = [];
  for (const p of list) {
    const passwordHash = await bcrypt.hash(p.password || defaultPassword, 10);
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { nama: p.nama, passwordHash, role, status: "ACTIVE", deletedAt: null },
      create: { nama: p.nama, email: p.email, passwordHash, role },
      select: { id: true, nama: true, email: true },
    });
    users.push(user);
  }
  return users;
}

(async () => {
  const instruktur = await upsertPersonel(INSTRUKTUR, "INSTRUKTUR", "instruktur123");
  const asisten = await upsertPersonel(ASISTEN, "ASISTEN_DOSEN", "asisten123");

  const courses = await prisma.mataKuliah.findMany({
    where: { deletedAt: null },
    select: { id: true, kode: true, nama: true },
    orderBy: { kode: "asc" },
  });

  const hasil = [];
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const inst = instruktur[i % instruktur.length];
    const as1 = asisten[(i * 2) % asisten.length];
    const as2 = asisten[(i * 2 + 1) % asisten.length];
    const asistenIds = as1.id === as2.id ? [as1.id] : [as1.id, as2.id];

    await prisma.mataKuliah.update({
      where: { id: course.id },
      data: { instrukturId: inst.id, asistenIds },
    });
    await prisma.schedule.updateMany({
      where: { mataKuliahId: course.id, deletedAt: null },
      data: { asistenIds },
    });

    hasil.push({
      kode: course.kode,
      mataKuliah: course.nama,
      instruktur: inst.nama,
      asisten: [as1.nama, as2.nama],
    });
  }

  console.log(
    JSON.stringify(
      {
        instrukturDibuat: instruktur.length,
        asistenDibuat: asisten.length,
        mataKuliahTerisi: hasil.length,
        login: {
          instruktur: "instruktur01 / aditya123 (s.d. instruktur07 / fajar123)",
          asisten: "asisten01@labops.local / asisten123",
        },
        daftar: hasil,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
})();
