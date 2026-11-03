import { PrismaService } from "../prisma/prisma.service";
import { dayOfWeekJakarta, startOfJakartaDay } from "./time";

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function daysOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function timeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMin(aStart) < timeToMin(bEnd) && timeToMin(aEnd) > timeToMin(bStart);
}

/**
 * Cek bentrok jadwal pada satu lab: sesi praktikum lain dan peminjaman yang
 * sudah disetujui pada hari & jam yang sama di rentang tanggal yang beririsan.
 */
export async function findScheduleConflict(
  prisma: PrismaService,
  params: {
    labId: string;
    hari: number;
    jamMulai: string;
    jamSelesai: string;
    tanggalMulai: Date;
    tanggalSelesai: Date;
    excludeId?: string;
  },
): Promise<{ conflict: false } | { conflict: true; type: "jadwal" | "peminjaman"; item: any }> {
  const { labId, hari, jamMulai, jamSelesai, tanggalMulai, tanggalSelesai, excludeId } = params;

  const existing = await prisma.schedule.findMany({
    where: { labId, hari, deletedAt: null, status: "AKTIF", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  for (const s of existing) {
    if (
      daysOverlap(s.tanggalMulai, s.tanggalSelesai, tanggalMulai, tanggalSelesai) &&
      timeOverlap(s.jamMulai, s.jamSelesai, jamMulai, jamSelesai)
    ) {
      return { conflict: true, type: "jadwal", item: s };
    }
  }

  const bookings = await prisma.booking.findMany({
    where: { labId, status: "DISETUJUI", deletedAt: null },
  });
  const mulaiDay = startOfJakartaDay(tanggalMulai);
  const selesaiDay = startOfJakartaDay(tanggalSelesai);
  for (const b of bookings) {
    const bDate = startOfJakartaDay(b.tanggal);
    if (dayOfWeekJakarta(bDate) !== hari) continue;
    if (bDate < mulaiDay || bDate > selesaiDay) continue;
    if (timeOverlap(b.jamMulai, b.jamSelesai, jamMulai, jamSelesai)) {
      return { conflict: true, type: "peminjaman", item: b };
    }
  }

  return { conflict: false };
}
