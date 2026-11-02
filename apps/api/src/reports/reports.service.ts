import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { addDays, dayOfWeekJakarta, startOfJakartaDay, todayJakarta } from "../common/time";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Ringkasan operasional untuk papan triage hari ini. */
  async today() {
    const today = todayJakarta();
    const tomorrow = addDays(today, 1);
    const hari = dayOfWeekJakarta(today);

    const [pendingBookings, approvedToday, openIssues, overdueIssues, sessions, attendanceToday, labsActive] = await Promise.all([
      this.prisma.booking.count({ where: { status: "DIAJUKAN", deletedAt: null } }),
      this.prisma.booking.count({ where: { status: "DISETUJUI", deletedAt: null, tanggal: { gte: today, lt: tomorrow } } }),
      this.prisma.issue.count({ where: { deletedAt: null, status: { in: ["BARU", "DIVERIFIKASI", "DALAM_PENANGANAN"] } } }),
      this.prisma.issue.count({ where: { deletedAt: null, status: { notIn: ["SELESAI", "DITOLAK"] }, dueAt: { lt: today } } }),
      this.prisma.schedule.findMany({
        where: { hari, deletedAt: null, status: "AKTIF", tanggalMulai: { lte: today }, tanggalSelesai: { gte: today } },
        include: { lab: { select: { kode: true, nama: true } }, pengampu: { select: { nama: true } } },
        orderBy: { jamMulai: "asc" },
      }),
      this.prisma.attendance.count({ where: { scannedAt: { gte: today, lt: tomorrow }, deletedAt: null } }),
      this.prisma.lab.count({ where: { status: "AKTIF", deletedAt: null } }),
    ]);

    const enrolled = sessions.length
      ? await this.prisma.classEnrollment.count({ where: { scheduleId: { in: sessions.map((s) => s.id) }, deletedAt: null } })
      : 0;

    return {
      date: today.toISOString().slice(0, 10),
      pendingBookings,
      approvedToday,
      openIssues,
      overdueIssues,
      sessionsToday: sessions.length,
      attendanceToday,
      labsActive,
      enrolledToday: enrolled,
      sessions,
    };
  }

  async dashboard() {
    const [users, labs, schedules, bookings, issues, attendance, inventory] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      this.prisma.lab.count({ where: { deletedAt: null, status: "AKTIF" } }),
      this.prisma.schedule.count({ where: { deletedAt: null, status: "AKTIF" } }),
      this.prisma.booking.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.issue.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.inventoryItem.groupBy({ by: ["kondisi"], where: { deletedAt: null }, _count: { _all: true } }),
    ]);
    const bookingMap: Record<string, number> = {};
    for (const b of bookings) bookingMap[b.status] = b._count._all;
    const issueMap: Record<string, number> = {};
    for (const i of issues) issueMap[i.status] = i._count._all;
    const attMap: Record<string, number> = {};
    for (const a of attendance) attMap[a.status] = a._count._all;
    const invMap: Record<string, number> = {};
    for (const v of inventory) invMap[v.kondisi] = v._count._all;

    // avg handling hours for completed issues
    const completed = await this.prisma.issue.findMany({ where: { status: "SELESAI", deletedAt: null }, select: { createdAt: true, updatedAt: true } });
    const avgHours = completed.length ? completed.reduce((sum, i) => sum + (i.updatedAt.getTime() - i.createdAt.getTime()) / 3600000, 0) / completed.length : 0;

    return {
      users, labs, schedules,
      bookings: bookingMap,
      issues: issueMap,
      attendance: attMap,
      inventory: invMap,
      avgIssueHandlingHours: Math.round(avgHours * 10) / 10,
    };
  }

  async weekly(weekStart: string, labId?: string, mataKuliah?: string) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const scheduleWhere: any = { deletedAt: null, status: "AKTIF" };
    if (labId) scheduleWhere.labId = labId;
    if (mataKuliah) scheduleWhere.mataKuliah = { contains: mataKuliah, mode: "insensitive" };
    const schedules = await this.prisma.schedule.findMany({ where: scheduleWhere });
    // sessions whose date range intersects the week
    const weekSessions = schedules.filter((s) => s.tanggalMulai <= end && s.tanggalSelesai >= start);

    // attendance in this week
    const attWhere: any = { scannedAt: { gte: start, lte: end } };
    if (labId) attWhere.labId = labId;
    const atts = await this.prisma.attendance.findMany({ where: attWhere });
    const attCounts: Record<string, number> = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, TIDAK_HADIR: 0 };
    for (const a of atts) attCounts[a.status] = (attCounts[a.status] || 0) + 1;

    // bookings cancelled in this week
    const cancelledBookings = await this.prisma.booking.count({
      where: { status: "DIBATALKAN", deletedAt: null, updatedAt: { gte: start, lte: end }, ...(labId ? { labId } : {}) },
    });
    // issues created this week
    const issuesCreated = await this.prisma.issue.count({
      where: { deletedAt: null, createdAt: { gte: start, lte: end }, ...(labId ? { labId } : {}) },
    });

    return {
      weekStart: start.toISOString().slice(0, 10),
      weekEnd: end.toISOString().slice(0, 10),
      sessionsScheduled: weekSessions.length,
      sessionsWithAttendance: new Set(atts.map((a) => a.sesiId)).size,
      attendance: attCounts,
      cancelledBookings,
      issuesCreated,
    };
  }

  async usage(from: string, to: string, labId?: string) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    const where: any = { scannedAt: { gte: start, lte: end } };
    if (labId) where.labId = labId;
    const atts = await this.prisma.attendance.findMany({ where, include: { lab: { select: { kode: true } } } });
    const byLab: Record<string, { total: number; hadir: number }> = {};
    for (const a of atts) {
      const kode = a.lab?.kode || a.labId;
      if (!byLab[kode]) byLab[kode] = { total: 0, hadir: 0 };
      byLab[kode].total++;
      if (a.status === "HADIR" || a.status === "TERLAMBAT") byLab[kode].hadir++;
    }
    return { from, to, byLab };
  }
}
