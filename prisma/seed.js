const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@labops.local";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: { nama: "Admin Sistem", email: adminEmail, passwordHash, role: "ADMIN_SYSTEM", status: "ACTIVE" },
    });
    console.log("Seeded admin:", adminEmail, "/ admin123");
  }

  const koordEmail = "koordinator@labops.local";
  const existingK = await prisma.user.findUnique({ where: { email: koordEmail } });
  if (!existingK) {
    const passwordHash = await bcrypt.hash("koord123", 10);
    await prisma.user.create({
      data: { nama: "Koordinator Lab", email: koordEmail, passwordHash, role: "COORDINATOR", status: "ACTIVE" },
    });
    console.log("Seeded koordinator:", koordEmail, "/ koord123");
  }

  const labs = [
    { kode: "LAB-1", nama: "Lab Komputer 1", kapasitas: 40, lokasi: "Gedung A Lt.2", qrToken: "qr-lab1-token" },
    { kode: "LAB-2", nama: "Lab Komputer 2", kapasitas: 35, lokasi: "Gedung A Lt.3", qrToken: "qr-lab2-token" },
  ];
  for (const l of labs) {
    await prisma.lab.upsert({ where: { kode: l.kode }, update: {}, create: l });
  }
  console.log("Seeded labs");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
