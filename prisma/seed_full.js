const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const fs = require("fs");
const prisma = new PrismaClient();

const DAY_NAMES = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

function slug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  // admin + koordinator (existing)
  const admins = [
    { nama: "Admin Sistem", email: "admin@labops.local", password: "admin123", role: "ADMIN_SYSTEM" },
    { nama: "Koordinator Lab", email: "koordinator@labops.local", password: "koord123", role: "COORDINATOR" },
  ];
  for (const a of admins) {
    const exists = await prisma.user.findUnique({ where: { email: a.email } });
    if (!exists) {
      const passwordHash = await bcrypt.hash(a.password, 10);
      await prisma.user.create({ data: { nama: a.nama, email: a.email, passwordHash, role: a.role, status: "ACTIVE" } });
      console.log("Seeded", a.email);
    }
  }

  const data = JSON.parse(fs.readFileSync("prisma/seed_data.json", "utf-8"));

  // labs
  const labMap = {};
  for (const l of data.labs) {
    const lab = await prisma.lab.upsert({
      where: { kode: l.kode },
      update: { nama: l.nama, lokasi: l.lokasi },
      create: { kode: l.kode, nama: l.nama, kapasitas: l.kapasitas, lokasi: l.lokasi, status: "AKTIF", qrToken: "qr-" + l.kode.toLowerCase() + "-" + Date.now() },
    });
    labMap[l.kode] = lab.id;
    console.log("Lab:", l.kode);
  }

  // dosens -> users
  const dosenMap = {};
  for (const d of data.dosens) {
    const email = slug(d) + "@labops.local";
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash("dosen123", 10);
      user = await prisma.user.create({
        data: { nama: d, email, passwordHash, role: "USER", subRoles: ["DOSEN"], status: "ACTIVE" },
      });
      console.log("Dosen user:", email, "/", d);
    }
    dosenMap[d] = user.id;
  }

  // schedules
  let created = 0, skipped = 0;
  for (const s of data.schedules) {
    const labId = labMap[s.labKode];
    if (!labId) { skipped++; continue; }
    const pengampuId = s.dosen ? (dosenMap[s.dosen] || null) : null;
    // check duplicate
    const dup = await prisma.schedule.findFirst({
      where: { labId, hari: s.hari, jamMulai: s.jamMulai, jamSelesai: s.jamSelesai, tanggalMulai: new Date("2026-09-01"), status: "AKTIF" },
    });
    if (dup) { skipped++; continue; }
    await prisma.schedule.create({
      data: {
        labId,
        mataKuliah: s.mataKuliah,
        kelas: s.kelas,
        pengampuId,
        hari: s.hari,
        jamMulai: s.jamMulai,
        jamSelesai: s.jamSelesai,
        tanggalMulai: new Date("2026-09-01"),
        tanggalSelesai: new Date("2027-01-31"),
        semester: "2026/2027 Ganjil",
        jenis: "PRAKTIKUM_RUTIN",
        status: "AKTIF",
      },
    });
    created++;
  }
  console.log("Schedules created:", created, "skipped:", skipped);
  console.log("Done. Dosen password default: dosen123");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
