import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { dayOfWeekJakarta, jakartaParts, parseTimeToMinutes, startOfJakartaDay } from "../common/time";

const TOLERANCE_MIN = 15;
const TOKEN_TTL_MIN = 15;
const MAX_LIMIT = 500;

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

    const existing = await this.prisma.attendance.findUnique({
      where: { sesiId_userId: { sesiId: active.id, userId } },
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

  async manual(sesiId: string, userId: string, status: string, reason: string, actorId: string) {
    if (!reason || !reason.trim()) throw new BadRequestException("Alasan wajib diisi");
    if (!["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "TIDAK_HADIR"].includes(status)) throw new BadRequestException("Status absensi tidak valid");
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi) throw new NotFoundException("Sesi tidak ditemukan");
    const existing = await this.prisma.attendance.findUnique({ where: { sesiId_userId: { sesiId, userId } } });
    if (existing) {
      const updated = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: { status: status as any, correctedBy: actorId, correctionReason: reason, oldValue: existing.status },
      });
      await this.audit.log({ actorId, action: "CORRECT_ATTENDANCE", objectType: "Attendance", objectId: existing.id, oldValue: { status: existing.status }, newValue: { status } });
      return updated;
    }
    const created = await this.prisma.attendance.create({
      data: { sesiId, userId, labId: sesi.labId, scannedAt: new Date(), status: status as any, qrTokenScanned: "MANUAL", correctedBy: actorId, correctionReason: reason },
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

  list(q: { sesiId?: string; userId?: string; labId?: string; from?: string; to?: string; page?: string; limit?: string }, actor?: { sub: string; role: string }) {
    const where: any = { deletedAt: null };
    if (actor?.role === "USER" && actor.sub) where.userId = actor.sub;
    else if (q.userId) where.userId = q.userId;
    if (q.sesiId) where.sesiId = q.sesiId;
    if (q.labId) where.labId = q.labId;
    if (q.from || q.to) {
      where.scannedAt = {};
      if (q.from) where.scannedAt.gte = startOfJakartaDay(q.from);
      if (q.to) where.scannedAt.lte = startOfJakartaDay(q.to);
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
