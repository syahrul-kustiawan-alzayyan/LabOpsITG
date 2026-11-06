const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const bcrypt = require("bcrypt");

  // 1. Buat prodi
  const prodiTIF = await prisma.prodi.upsert({
    where: { kode: "TIF" },
    update: { nama: "Teknik Informatika", status: "AKTIF" },
    create: { kode: "TIF", nama: "Teknik Informatika", status: "AKTIF" },
  });

  const prodiSI = await prisma.prodi.upsert({
    where: { kode: "SIS" },
    update: { nama: "Sistem Informasi", status: "AKTIF" },
    create: { kode: "SIS", nama: "Sistem Informasi", status: "AKTIF" },
  });

  console.log("Prodi:", prodiTIF.nama, prodiSI.nama);

  // 2. Buat periode
  const periodeGanjil = await prisma.periode.upsert({
    where: { kode: "202627-GANJIL" },
    update: {
      nama: "2026/2027 Ganjil",
      tanggalMulai: new Date("2026-09-01"),
      tanggalSelesai: new Date("2027-01-31"),
      status: "AKTIF",
      isCurrent: true,
    },
    create: {
      nama: "2026/2027 Ganjil",
      kode: "202627-GANJIL",
      tanggalMulai: new Date("2026-09-01"),
      tanggalSelesai: new Date("2027-01-31"),
      status: "AKTIF",
      isCurrent: true,
    },
  });

  const periodeGenap = await prisma.periode.upsert({
    where: { kode: "202627-GENAP" },
    update: {
      nama: "2026/2027 Genap",
      tanggalMulai: new Date("2027-02-01"),
      tanggalSelesai: new Date("2027-07-31"),
      status: "AKTIF",
      isCurrent: false,
    },
    create: {
      nama: "2026/2027 Genap",
      kode: "202627-GENAP",
      tanggalMulai: new Date("2027-02-01"),
      tanggalSelesai: new Date("2027-07-31"),
      status: "AKTIF",
      isCurrent: false,
    },
  });

  console.log("Periode:", periodeGanjil.nama, periodeGenap.nama);

  // 3. Buat akun kaprodi untuk setiap prodi
  const hashTIF = await bcrypt.hash("kaprodi123", 10);
  const kaprodiTIF = await prisma.user.upsert({
    where: { email: "kaprodi-tif@labops.local" },
    update: { nama: "Kaprodi Teknik Informatika", role: "KAPRODI", subRoles: ["DOSEN"], prodiId: prodiTIF.id, status: "ACTIVE", deletedAt: null },
    create: { nama: "Kaprodi Teknik Informatika", email: "kaprodi-tif@labops.local", passwordHash: hashTIF, role: "KAPRODI", subRoles: ["DOSEN"], prodiId: prodiTIF.id, status: "ACTIVE" },
  });

  const hashSI = await bcrypt.hash("kaprodi123", 10);
  const kaprodiSI = await prisma.user.upsert({
    where: { email: "kaprodi-sis@labops.local" },
    update: { nama: "Kaprodi Sistem Informasi", role: "KAPRODI", subRoles: ["DOSEN"], prodiId: prodiSI.id, status: "ACTIVE", deletedAt: null },
    create: { nama: "Kaprodi Sistem Informasi", email: "kaprodi-sis@labops.local", passwordHash: hashSI, role: "KAPRODI", subRoles: ["DOSEN"], prodiId: prodiSI.id, status: "ACTIVE" },
  });

  console.log("Kaprodi TIF:", kaprodiTIF.nama, kaprodiTIF.prodiId);
  console.log("Kaprodi SIS:", kaprodiSI.nama, kaprodiSI.prodiId);

  // 4. Set kaprodi di prodi
  await prisma.prodi.update({
    where: { id: prodiTIF.id },
    data: { kaprodiId: kaprodiTIF.id },
  });
  await prisma.prodi.update({
    where: { id: prodiSI.id },
    data: { kaprodiId: kaprodiSI.id },
  });

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
