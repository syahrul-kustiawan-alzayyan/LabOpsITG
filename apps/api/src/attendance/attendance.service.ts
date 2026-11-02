import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

const TOLERANCE_MIN = 15;

function nowMin(d: Date) { return d.getHours() * 60 + d.getMinutes(); }
function parseTime(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  async scan(qrToken: string, userId: string) {
    const lab = await this.prisma.lab.findUnique({ where: { qrToken } });
    if (!lab || lab.deletedAt) throw new BadRequestException("QR code tidak valid");
    const now = new Date();
    const hari = now.getDay();
    // active sessions for this lab today within date range and time window (with tolerance)
    const sessions = await this.prisma.schedule.findMany({
      where: { labId: lab.id, hari, deletedAt: null, status: "AKTIF" },
    });
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const active = sessions.find((s) => {
      const sStart = new Date(s.tanggalMulai.getFullYear(), s.tanggalMulai.getMonth(), s.tanggalMulai.getDate());
      const sEnd = new Date(s.tanggalSelesai.getFullYear(), s.tanggalSelesai.getMonth(), s.tanggalSelesai.getDate());
      if (today < sStart || today > sEnd) return false;
      const start = parseTime(s.jamMulai);
      const end = parseTime(s.jamSelesai);
      const cur = nowMin(now);
      return cur >= start - 10 && cur <= end + TOLERANCE_MIN;
    });
    if (!active) throw new BadRequestException("Tidak ada sesi praktikum yang sedang berlangsung di lab ini");
    // already attended?
    const existing = await this.prisma.attendance.findUnique({ where: { sesiId_userId: { sesiId: active.id, userId } } });
    if (existing) throw new BadRequestException("Anda sudah melakukan absensi untuk sesi ini");
    const cur = nowMin(now);
    const start = parseTime(active.jamMulai);
    const status = cur <= start + TOLERANCE_MIN ? "HADIR" : "TERLAMBAT";
    const att = await this.prisma.attendance.create({
      data: { sesiId: active.id, userId, labId: lab.id, scannedAt: now, status: status as any, qrTokenScanned: qrToken },
    });
    await this.audit.log({ actorId: userId, action: "SCAN_ATTENDANCE", objectType: "Attendance", objectId: att.id, newValue: att });
    return { attendance: att, session: { id: active.id, mataKuliah: active.mataKuliah, kelas: active.kelas }, status };
  }

  async manual(sesiId: string, userId: string, status: string, reason: string, actorId: string) {
    if (!reason || !reason.trim()) throw new BadRequestException("Alasan wajib diisi");
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
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KOREKSI_ABSENSI", `Permintaan koreksi absensi untuk sesi ${sesi.mataKuliah} (${sesi.kelas}): ${reason}`);
    return { ok: true };
  }

  list(q: { sesiId?: string; userId?: string; labId?: string; from?: string; to?: string }) {
    const where: any = { deletedAt: null };
    if (q.sesiId) where.sesiId = q.sesiId;
    if (q.userId) where.userId = q.userId;
    if (q.labId) where.labId = q.labId;
    if (q.from || q.to) {
      where.scannedAt = {};
      if (q.from) where.scannedAt.gte = new Date(q.from);
      if (q.to) where.scannedAt.lte = new Date(q.to);
    }
    return this.prisma.attendance.findMany({
      where,
      include: { user: { select: { nama: true, email: true } }, sesi: { select: { mataKuliah: true, kelas: true, jamMulai: true, jamSelesai: true } }, lab: { select: { kode: true } } },
      orderBy: { scannedAt: "desc" },
    });
  }

  async recap(sesiId: string) {
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi) throw new NotFoundException("Sesi tidak ditemukan");
    const atts = await this.prisma.attendance.findMany({ where: { sesiId } });
    const counts: Record<string, number> = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, TIDAK_HADIR: 0 };
    for (const a of atts) counts[a.status] = (counts[a.status] || 0) + 1;
    return { sesi, total: atts.length, counts };
  }
}
