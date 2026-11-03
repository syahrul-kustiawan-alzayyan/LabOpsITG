/**
 * Backfill tabel MataKuliah dari jadwal yang sudah ada.
 *
 * Setiap nama mata kuliah pada Schedule dikelompokkan menjadi satu MataKuliah,
 * lalu seluruh sesi (kelas) dihubungkan lewat Schedule.mataKuliahId.
 *
 * Jalankan sekali setelah migrasi:
 *   node prisma/backfill_mata_kuliah.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STOPWORDS = new Set(["praktikum", "prak", "dan", "di", "&", "+", "the", "of"]);

function initials(name) {
  const words = String(name)
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const code = words.map((w) => w[0]).join("").toUpperCase().slice(0, 5);
  return code || "MK";
}

async function main() {
  const existingCodes = new Set((await prisma.mataKuliah.findMany({ select: { kode: true } })).map((c) => c.kode));

  function nextCode(base) {
    if (!existingCodes.has(base)) {
      existingCodes.add(base);
      return base;
    }
    let n = 2;
    while (existingCodes.has(`${base}-${n}`)) n += 1;
    const code = `${base}-${n}`;
    existingCodes.add(code);
    return code;
  }

  const schedules = await prisma.schedule.findMany({
    where: { deletedAt: null, mataKuliahId: null },
    select: { id: true, mataKuliah: true, pengampuId: true, asistenIds: true },
  });

  const groups = new Map();
  for (const s of schedules) {
    const nama = String(s.mataKuliah || "").trim();
    if (!nama) continue;
    if (!groups.has(nama)) groups.set(nama, []);
    groups.get(nama).push(s);
  }

  let created = 0;
  let linked = 0;

  for (const [nama, rows] of groups) {
    const existing = await prisma.mataKuliah.findFirst({ where: { nama } });
    let course = existing;

    if (!course) {
      const dosenCount = new Map();
      for (const r of rows) {
        if (!r.pengampuId) continue;
        dosenCount.set(r.pengampuId, (dosenCount.get(r.pengampuId) || 0) + 1);
      }
      const dosenId = [...dosenCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const asistenIds = Array.from(new Set(rows.flatMap((r) => r.asistenIds || [])));

      course = await prisma.mataKuliah.create({
        data: { kode: nextCode(initials(nama)), nama, dosenId, asistenIds, semester: 1, sks: 3 },
      });
      created += 1;
    }

    const result = await prisma.schedule.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { mataKuliahId: course.id },
    });
    linked += result.count;
  }

  console.log(JSON.stringify({ courses: groups.size, created, linkedSchedules: linked }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
