import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  DAY_NAMES,
  dayOfWeekJakarta,
  jakartaParts,
  parseTimeToMinutes,
  startOfJakartaDay,
  todayJakarta,
} from "../common/time";

const TOLERANCE_MIN = 15;
const TOKEN_TTL_MIN = 15;
const MAX_LIMIT = 500;
const ATTENDANCE_STATUSES = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "TIDAK_HADIR"] as const;
const TEAM_MARK = "INSTRUKTUR";
type TeamStatus = (typeof ATTENDANCE_STATUSES)[number];

type SessionActor = { sub: string; role: string; subRoles?: string[] };

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  /** Sesi yang sedang berjalan di lab pada waktu sekarang (zona Jakarta). */
  private async findActiveSession(labId: string, now = new Date()) {
    const today = startOfJakartaDay(now);
    const hari = dayOfWeekJakarta(today);
    const minutes = jakartaParts(now).minutes;
    const sessions = await this.prisma.schedule.findMany({
      where: { labId, hari, deletedAt: null, status: "AKTIF" },
    });
    return (
      sessions.find((s) => {
        const mulai = startOfJakartaDay(s.tanggalMulai);
        const selesai = startOfJakartaDay(s.tanggalSelesai);
        if (today < mulai || today > selesai) return false;
        const start = parseTimeToMinutes(s.jamMulai);
        const end = parseTimeToMinutes(s.jamSelesai);
        return minutes >= start - 10 && minutes <= end + TOLERANCE_MIN;
      }) || null
    );
  }

  async scan(qrToken: string, userId: string) {
    if (!qrToken || !qrToken.trim()) throw new BadRequestException("QR code tidak valid");
    const now = new Date();

    // 1. Token sesi (berotasi, kedaluwarsa 15 menit)
    const sessionToken = await this.prisma.sessionQrToken.findUnique({
      where: { token: qrToken.trim() },
      include: { schedule: true },
    });
    let active = null;
    if (sessionToken && sessionToken.expiresAt > now) {
      const s = sessionToken.schedule;
      const today = startOfJakartaDay(now);
      const inRange = today >= startOfJakartaDay(s.tanggalMulai) && today <= startOfJakartaDay(s.tanggalSelesai);
      if (s.deletedAt || s.status !== "AKTIF" || !inRange) throw new BadRequestException("QR sesi tidak berlaku hari ini");
      active = s;
    }

    // 2. Token statis lab (kompatibel dengan QR cetak) — tetap butuh sesi aktif + enrollment
    if (!active) {
      const lab = await this.prisma.lab.findUnique({ where: { qrToken: qrToken.trim() } });
      if (!lab || lab.deletedAt) throw new BadRequestException("QR code tidak valid");
      active = await this.findActiveSession(lab.id, now);
      if (!active) throw new BadRequestException("Tidak ada sesi praktikum yang sedang berlangsung di lab ini");
    }

    // 3. Hanya peserta terdaftar pada sesi tersebut
    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: { scheduleId_userId: { scheduleId: active.id, userId } },
    });
    if (!enrollment || enrollment.deletedAt) {
      throw new ForbiddenException("Anda tidak terdaftar pada kelas praktikum ini");
    }

    const today = todayJakarta();
    const existing = await this.prisma.attendance.findUnique({
      where: { sesiId_userId_tanggal: { sesiId: active.id, userId, tanggal: today } },
    });
    if (existing) throw new BadRequestException("Anda sudah melakukan absensi untuk sesi ini");

    const minutes = jakartaParts(now).minutes;
    const start = parseTimeToMinutes(active.jamMulai);
    const status = minutes <= start + TOLERANCE_MIN ? "HADIR" : "TERLAMBAT";

    const att = await this.prisma.attendance.create({
      data: {
        sesiId: active.id,
        userId,
        labId: active.labId,
        tanggal: today,
        scannedAt: now,
        status: status as any,
        qrTokenScanned: qrToken.trim(),
      },
    });
    await this.audit.log({ actorId: userId, action: "SCAN_ATTENDANCE", objectType: "Attendance", objectId: att.id, newValue: att });
    return {
      attendance: att,
      session: { id: active.id, mataKuliah: active.mataKuliah, kelas: active.kelas, jamMulai: active.jamMulai, jamSelesai: active.jamSelesai },
      status,
    };
  }

  async createSessionToken(sesiId: string, actorId: string) {
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi || sesi.deletedAt) throw new NotFoundException("Sesi tidak ditemukan");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MIN * 60 * 1000);
    // bersihkan token kedaluwarsa milik sesi ini
    await this.prisma.sessionQrToken.deleteMany({ where: { scheduleId: sesiId, expiresAt: { lt: now } } });
    const token = randomBytes(9).toString("base64url");
    const created = await this.prisma.sessionQrToken.create({
      data: { scheduleId: sesiId, token, expiresAt, createdBy: actorId },
    });
    await this.audit.log({ actorId, action: "CREATE_SESSION_QR", objectType: "Schedule", objectId: sesiId, newValue: { expiresAt } });
    return { token: created.token, expiresAt: created.expiresAt, sesi: { id: sesi.id, mataKuliah: sesi.mataKuliah, kelas: sesi.kelas } };
  }

  async activeSessionTokens(actorId: string) {
    const now = new Date();
    return this.prisma.sessionQrToken.findMany({
      where: { expiresAt: { gt: now }, createdBy: actorId },
      include: { schedule: { select: { id: true, mataKuliah: true, kelas: true, jamMulai: true, jamSelesai: true, lab: { select: { kode: true, nama: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  private teamMember(
    users: Map<string, { id: string; nama: string; email: string }>,
    attendance: Map<string, any>,
    userId: string,
    peran: "INSTRUKTUR" | "ASISTEN_DOSEN",
  ) {
    const user = users.get(userId);
    if (!user) return null;
    const att = attendance.get(userId) || null;
    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      peran,
      status: att?.status ?? null,
      attendanceId: att?.id ?? null,
      scannedAt: att?.scannedAt ?? null,
      source: att?.qrTokenScanned ?? null,
    };
  }

  /**
   * Sesi milik instruktur pada tanggal tertentu, lengkap dengan status absensi
   * instruktur dan asisten dosen. Dipakai halaman Absensi tim pengajar.
   */
  async team(dateStr: string | undefined, actor: SessionActor) {
    const day = dateStr ? startOfJakartaDay(dateStr) : todayJakarta();
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Tanggal absensi tidak valid");
    const today = todayJakarta();
    const hari = dayOfWeekJakarta(day);
    const isToday = day.getTime() === today.getTime();

    const sessions = await this.prisma.schedule.findMany({
      where: {
        deletedAt: null,
        status: "AKTIF",
        hari,
        tanggalMulai: { lte: day },
        tanggalSelesai: { gte: day },
        course: { instrukturId: actor.sub, deletedAt: null },
      },
      include: {
        lab: { select: { id: true, kode: true, nama: true } },
        course: {
          select: { id: true, kode: true, nama: true, instrukturId: true, asistenIds: true },
        },
        attendances: { where: { tanggal: day, deletedAt: null } },
      },
      orderBy: [{ jamMulai: "asc" }, { kelas: "asc" }],
    });

    const teamIds = new Set<string>([actor.sub]);
    for (const s of sessions) {
      if (s.course?.instrukturId) teamIds.add(s.course.instrukturId);
      for (const id of s.course?.asistenIds ?? []) teamIds.add(id);
      for (const id of s.asistenIds ?? []) teamIds.add(id);
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...teamIds] }, deletedAt: null },
      select: { id: true, nama: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const nowMinutes = jakartaParts(new Date()).minutes;

    return {
      date: day.toISOString().slice(0, 10),
      hari,
      hariNama: DAY_NAMES[hari],
      isToday,
      canMark: day.getTime() <= today.getTime(),
      sessions: sessions.map((s) => {
        const attendance = new Map(s.attendances.map((a) => [a.userId, a]));
        const asistenIds = [...new Set([...(s.course?.asistenIds ?? []), ...s.asistenIds])];
        const members = [
          s.course?.instrukturId ? this.teamMember(byId, attendance, s.course.instrukturId, "INSTRUKTUR") : null,
          ...asistenIds.map((id) => this.teamMember(byId, attendance, id, "ASISTEN_DOSEN")),
        ].filter((m): m is NonNullable<typeof m> => Boolean(m));

        const start = parseTimeToMinutes(s.jamMulai);
        const end = parseTimeToMinutes(s.jamSelesai);
        return {
          id: s.id,
          mataKuliah: s.course?.nama ?? s.mataKuliah,
          kode: s.course?.kode ?? null,
          kelas: s.kelas,
          semester: s.semester,
          jamMulai: s.jamMulai,
          jamSelesai: s.jamSelesai,
          lab: s.lab,
          members,
          complete: members.length > 0 && members.every((m) => m.status),
          ongoing: isToday && nowMinutes >= start - 10 && nowMinutes <= end + TOLERANCE_MIN,
        };
      }),
    };
  }

  /** Instruktur mencatat kehadiran dirinya dan asisten dosen untuk satu pertemuan. */
  async markTeam(
    sesiId: string,
    records: { userId: string; status: string; reason?: string }[],
    actor: SessionActor,
    dateStr?: string,
  ) {
    if (!Array.isArray(records) || records.length === 0) throw new BadRequestException("Tidak ada anggota tim yang dipilih");
    const day = dateStr ? startOfJakartaDay(dateStr) : todayJakarta();
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Tanggal absensi tidak valid");

    const sesi = await this.prisma.schedule.findUnique({
      where: { id: sesiId },
      include: { course: { select: { instrukturId: true, asistenIds: true } } },
    });
    if (!sesi || sesi.deletedAt || sesi.status !== "AKTIF") throw new NotFoundException("Sesi tidak ditemukan");
    if (!sesi.course) throw new BadRequestException("Sesi belum tertaut dengan mata kuliah");
    if (actor.role !== "ADMIN_SYSTEM" && sesi.course.instrukturId !== actor.sub) {
      throw new ForbiddenException("Hanya instruktur pengampu yang dapat mengisi absensi tim ini");
    }

    const today = todayJakarta();
    if (day.getTime() > today.getTime()) throw new BadRequestException("Absensi belum dapat diisi sebelum hari pelaksanaan");
    if (day < startOfJakartaDay(sesi.tanggalMulai) || day > startOfJakartaDay(sesi.tanggalSelesai)) {
      throw new BadRequestException("Tanggal di luar periode sesi praktikum");
    }
    if (dayOfWeekJakarta(day) !== sesi.hari) throw new BadRequestException("Tanggal tidak sesuai hari jadwal sesi");

    const allowed = new Set<string>();
    if (sesi.course.instrukturId) allowed.add(sesi.course.instrukturId);
    for (const id of [...sesi.course.asistenIds, ...sesi.asistenIds]) allowed.add(id);

    const saved: any[] = [];
    for (const record of records) {
      if (!record?.userId || !allowed.has(record.userId)) {
        throw new BadRequestException("Anggota tim tidak terdaftar pada mata kuliah ini");
      }
      if (!ATTENDANCE_STATUSES.includes(record.status as TeamStatus)) {
        throw new BadRequestException("Status absensi tidak valid");
      }
      const reason = record.reason?.trim() || "Absensi tim pengajar oleh instruktur";
      const existing = await this.prisma.attendance.findUnique({
        where: { sesiId_userId_tanggal: { sesiId, userId: record.userId, tanggal: day } },
      });
      if (existing) {
        const updated = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: record.status as any,
            correctedBy: actor.sub,
            correctionReason: reason,
            oldValue: existing.status,
          },
        });
        await this.audit.log({
          actorId: actor.sub,
          action: "TEAM_ATTENDANCE_CORRECTION",
          objectType: "Attendance",
          objectId: existing.id,
          oldValue: { status: existing.status },
          newValue: { status: record.status, sesiId, tanggal: day },
        });
        saved.push(updated);
      } else {
        const created = await this.prisma.attendance.create({
          data: {
            sesiId,
            userId: record.userId,
            labId: sesi.labId,
            tanggal: day,
            scannedAt: new Date(),
            status: record.status as any,
            qrTokenScanned: TEAM_MARK,
            correctedBy: actor.sub,
            correctionReason: reason,
          },
        });
        await this.audit.log({
          actorId: actor.sub,
          action: "TEAM_ATTENDANCE",
          objectType: "Attendance",
          objectId: created.id,
          newValue: { userId: record.userId, status: record.status, sesiId, tanggal: day },
        });
        saved.push(created);
      }
    }

    return { ok: true, date: day.toISOString().slice(0, 10), marked: saved.length, records: saved };
  }

  async manual(sesiId: string, userId: string, status: string, reason: string, actorId: string, tanggal?: string) {
    if (!reason || !reason.trim()) throw new BadRequestException("Alasan wajib diisi");
    if (!ATTENDANCE_STATUSES.includes(status as TeamStatus)) throw new BadRequestException("Status absensi tidak valid");
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi) throw new NotFoundException("Sesi tidak ditemukan");
    const day = tanggal ? startOfJakartaDay(tanggal) : todayJakarta();
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Tanggal absensi tidak valid");
    const existing = await this.prisma.attendance.findUnique({
      where: { sesiId_userId_tanggal: { sesiId, userId, tanggal: day } },
    });
    if (existing) {
      const updated = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: { status: status as any, correctedBy: actorId, correctionReason: reason, oldValue: existing.status },
      });
      await this.audit.log({ actorId, action: "CORRECT_ATTENDANCE", objectType: "Attendance", objectId: existing.id, oldValue: { status: existing.status }, newValue: { status } });
      return updated;
    }
    const created = await this.prisma.attendance.create({
      data: { sesiId, userId, labId: sesi.labId, tanggal: day, scannedAt: new Date(), status: status as any, qrTokenScanned: "MANUAL", correctedBy: actorId, correctionReason: reason },
    });
    await this.audit.log({ actorId, action: "MANUAL_ATTENDANCE", objectType: "Attendance", objectId: created.id, newValue: created });
    return created;
  }

  async requestCorrection(sesiId: string, reason: string, userId: string) {
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi) throw new NotFoundException("Sesi tidak ditemukan");
    if (!reason || !reason.trim()) throw new BadRequestException("Alasan wajib diisi");
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KOREKSI_ABSENSI", `Permintaan koreksi absensi untuk sesi ${sesi.mataKuliah} (${sesi.kelas}): ${reason}`);
    return { ok: true };
  }

  list(
    q: { sesiId?: string; userId?: string; labId?: string; from?: string; to?: string; page?: string; limit?: string },
    actor?: SessionActor,
  ) {
    const where: any = { deletedAt: null };
    if (actor?.role === "USER" && actor.sub) {
      if (actor.subRoles?.includes("INSTRUKTUR")) {
        where.OR = [{ userId: actor.sub }, { sesi: { course: { instrukturId: actor.sub } } }];
      } else {
        where.userId = actor.sub;
      }
    } else if (q.userId) where.userId = q.userId;
    if (q.sesiId) where.sesiId = q.sesiId;
    if (q.labId) where.labId = q.labId;
    if (q.from || q.to) {
      where.tanggal = {};
      if (q.from) where.tanggal.gte = startOfJakartaDay(q.from);
      if (q.to) where.tanggal.lte = startOfJakartaDay(q.to);
    }
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 200));
    return this.prisma.attendance.findMany({
      where,
      include: {
        user: { select: { nama: true, email: true } },
        sesi: { select: { id: true, mataKuliah: true, kelas: true, jamMulai: true, jamSelesai: true } },
        lab: { select: { kode: true } },
      },
      orderBy: { scannedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async recap(sesiId: string) {
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi) throw new NotFoundException("Sesi tidak ditemukan");
    const [atts, enrolled] = await Promise.all([
      this.prisma.attendance.findMany({ where: { sesiId }, include: { user: { select: { id: true, nama: true, email: true } } } }),
      this.prisma.classEnrollment.count({ where: { scheduleId: sesiId, deletedAt: null } }),
    ]);
    const counts: Record<string, number> = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, TIDAK_HADIR: 0 };
    for (const a of atts) counts[a.status] = (counts[a.status] || 0) + 1;
    return { sesi, total: atts.length, enrolled, counts, records: atts };
  }

  async enrollments(sesiId: string) {
    const [enrolled, users] = await Promise.all([
      this.prisma.classEnrollment.findMany({
        where: { scheduleId: sesiId, deletedAt: null },
        include: { user: { select: { id: true, nama: true, email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true, nama: true, email: true, subRoles: true, role: true },
        orderBy: { nama: "asc" },
      }),
    ]);
    return { enrolled, users };
  }

  async addEnrollment(sesiId: string, userId: string, actorId: string) {
    if (!sesiId || !userId) throw new BadRequestException("Sesi dan pengguna wajib diisi");
    const [sesi, user] = await Promise.all([
      this.prisma.schedule.findUnique({ where: { id: sesiId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!sesi || sesi.deletedAt) throw new NotFoundException("Sesi tidak ditemukan");
    if (!user || user.deletedAt) throw new NotFoundException("Pengguna tidak ditemukan");
    const enrollment = await this.prisma.classEnrollment.upsert({
      where: { scheduleId_userId: { scheduleId: sesiId, userId } },
      update: { deletedAt: null },
      create: { scheduleId: sesiId, userId },
    });
    await this.audit.log({ actorId, action: "ENROLL_STUDENT", objectType: "ClassEnrollment", objectId: enrollment.id, newValue: { sesiId, userId } });
    return enrollment;
  }

  async removeEnrollment(id: string, actorId: string) {
    const existing = await this.prisma.classEnrollment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Peserta tidak ditemukan");
    await this.prisma.classEnrollment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ actorId, action: "UNENROLL_STUDENT", objectType: "ClassEnrollment", objectId: id, oldValue: existing });
    return { ok: true };
  }
}
