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

  // ---------------------------------------------------------------- mahasiswa
  const students = [
    "Rina Nurhaliza", "Fajar Ramadhan", "Siti Aisyah", "Dimas Pratama",
    "Nabila Putri", "Yoga Saputra", "Ayu Lestari", "Rizky Maulana",
    "Dewi Anggraini", "Hafiz Fadillah", "Intan Permata", "Bayu Nugroho",
  ];
  const studentIds = [];
  for (let i = 0; i < students.length; i++) {
    const email = `mhs${String(i + 1).padStart(2, "0")}@labops.local`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash("mhs123", 10);
      user = await prisma.user.create({
        data: { nama: students[i], email, passwordHash, role: "USER", subRoles: ["MAHASISWA"], status: "ACTIVE" },
      });
    }
    studentIds.push(user.id);
  }

  // ---------------------------------------------------------------- enrollment
  const allSchedules = await prisma.schedule.findMany({ where: { deletedAt: null }, orderBy: [{ hari: "asc" }, { jamMulai: "asc" }] });
  let enrolled = 0;
  for (let i = 0; i < allSchedules.length; i++) {
    const s = allSchedules[i];
    const picks = [0, 1, 2, 3, 4, 5].map((offset) => studentIds[(i * 2 + offset) % studentIds.length]);
    for (const userId of Array.from(new Set(picks))) {
      await prisma.classEnrollment.upsert({
        where: { scheduleId_userId: { scheduleId: s.id, userId } },
        update: { deletedAt: null },
        create: { scheduleId: s.id, userId },
      });
      enrolled++;
    }
  }
  console.log("Enrollments:", enrolled);

  // ---------------------------------------------------------------- inventory
  const inventorySeed = [
    { kategori: "PC", nama: "PC All-in-One", perLab: 20 },
    { kategori: "PERIFERAL", nama: "Monitor 24 inci", perLab: 2 },
    { kategori: "JARINGAN", nama: "Switch 24 Port", perLab: 1 },
    { kategori: "PERANGKAT_PENDUKUNG", nama: "Proyektor", perLab: 1 },
  ];
  let invCount = 0;
  for (const [kode, labId] of Object.entries(labMap)) {
    for (const item of inventorySeed) {
      for (let n = 1; n <= item.perLab; n++) {
        const kodeAset = `INV-${kode}-${item.kategori.slice(0, 3)}-${String(n).padStart(2, "0")}`;
        const exists = await prisma.inventoryItem.findUnique({ where: { kodeAset } });
        if (exists) continue;
        await prisma.inventoryItem.create({
          data: {
            kodeAset,
            nama: `${item.nama} ${n}`,
            kategori: item.kategori,
            labId,
            kondisi: n === item.perLab && item.kategori === "PC" ? "PERLU_PERAWATAN" : "BAIK",
            tanggalPerolehan: new Date("2025-08-15"),
          },
        });
        invCount++;
      }
    }
  }
  console.log("Inventory items:", invCount);

  // ---------------------------------------------------------------- demo bookings
  const today = new Date();
  const dayBase = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const demoBookings = [
    { offset: 2, jamMulai: "13:00", jamSelesai: "15:00", keperluan: "Workshop pemrograman kompetitif", status: "DIAJUKAN" },
    { offset: 3, jamMulai: "09:00", jamSelesai: "11:00", keperluan: "Rapat asisten dosen", status: "DIAJUKAN" },
    { offset: 1, jamMulai: "16:00", jamSelesai: "17:30", keperluan: "Ujian susulan praktikum", status: "DISETUJUI" },
    { offset: -3, jamMulai: "10:00", jamSelesai: "12:00", keperluan: "Pelatihan robotika", status: "SELESAI" },
  ];
  const labIds = Object.values(labMap);
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@labops.local" } });
  for (let i = 0; i < demoBookings.length; i++) {
    const b = demoBookings[i];
    const tanggal = new Date(dayBase);
    tanggal.setUTCDate(tanggal.getUTCDate() + b.offset);
    const exists = await prisma.booking.findFirst({ where: { tanggal, keperluan: b.keperluan } });
    if (exists) continue;
    await prisma.booking.create({
      data: {
        peminjamId: adminUser.id,
        labId: labIds[i % labIds.length],
        tanggal,
        jamMulai: b.jamMulai,
        jamSelesai: b.jamSelesai,
        keperluan: b.keperluan,
        jumlahPeserta: 20,
        status: b.status,
        pemrosesId: b.status === "DIAJUKAN" ? null : adminUser.id,
      },
    });
  }

  // ---------------------------------------------------------------- demo issues
  const demoIssues = [
    { kategori: "PERANGKAT", urgensi: "TINGGI", deskripsi: "PC nomor 12 tidak menyala setelah listrik padam.", status: "BARU" },
    { kategori: "JARINGAN", urgensi: "SEDANG", deskripsi: "Koneksi internet di lab 2 terputus sejak pagi.", status: "DALAM_PENANGANAN" },
    { kategori: "FASILITAS", urgensi: "RENDAH", deskripsi: "AC ruang lab 3 kurang dingin.", status: "SELESAI" },
  ];
  for (let i = 0; i < demoIssues.length; i++) {
    const it = demoIssues[i];
    const nomorTiket = `KDL-DEMO-${String(i + 1).padStart(2, "0")}`;
    const exists = await prisma.issue.findUnique({ where: { nomorTiket } });
    if (exists) continue;
    const due = new Date(dayBase);
    due.setUTCDate(due.getUTCDate() + (it.urgensi === "TINGGI" ? 1 : it.urgensi === "SEDANG" ? 3 : 7));
    const issue = await prisma.issue.create({
      data: {
        nomorTiket,
        pelaporId: studentIds[i % studentIds.length],
        labId: labIds[i % labIds.length],
        kategori: it.kategori,
        urgensi: it.urgensi,
        deskripsi: it.deskripsi,
        status: it.status,
        dueAt: due,
        resolvedAt: it.status === "SELESAI" ? new Date() : null,
      },
    });
    await prisma.issueHistory.create({ data: { issueId: issue.id, status: "BARU", catatan: "Tiket dibuat (data demo)", actorId: studentIds[i % studentIds.length] } });
  }

  // ---------------------------------------------------------------- recruitment
  let period = await prisma.recruitmentPeriod.findFirst({ where: { posisi: "Asisten Dosen" } });
  if (!period) {
    const tenggat = new Date(dayBase);
    tenggat.setUTCDate(tenggat.getUTCDate() + 30);
    period = await prisma.recruitmentPeriod.create({
      data: {
        posisi: "Asisten Dosen",
        mataKuliah: "Praktikum Basis Data",
        kuota: 6,
        persyaratan: "Mahasiswa aktif semester 3 ke atas, IPK minimal 3.0.",
        tenggat,
        status: "DIBUKA",
      },
    });
  }
  for (let i = 0; i < 4; i++) {
    const pelamarId = studentIds[i];
    const exists = await prisma.application.findFirst({ where: { periodId: period.id, pelamarId } });
    if (exists) continue;
    await prisma.application.create({
      data: {
        periodId: period.id,
        pelamarId,
        mataKuliahDilamar: period.mataKuliah,
        motivasi: "Ingin membantu jalannya praktikum dan memperdalam materi.",
        nilai: 3.2 + i * 0.1,
        status: i === 0 ? "WAWANCARA" : "DIAJUKAN",
      },
    });
  }

  console.log("Demo data: mahasiswa, enrollment, inventaris, peminjaman, kendala, rekrutmen");
  console.log("Done. Dosen password default: dosen123 | Mahasiswa: mhs123");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
