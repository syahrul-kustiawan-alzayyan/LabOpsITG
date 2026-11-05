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
      where: { sesiId_userId_tanggal_pertemuanKe: { sesiId: active.id, userId, tanggal: today, pertemuanKe: null } },
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

  async createSessionToken(
    sesiId: string,
    actorId: string,
    scope?: { tanggal?: Date; pertemuanKe?: number | null },
  ) {
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi || sesi.deletedAt) throw new NotFoundException("Sesi tidak ditemukan");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MIN * 60 * 1000);
    // bersihkan token kedaluwarsa milik sesi ini
    await this.prisma.sessionQrToken.deleteMany({ where: { scheduleId: sesiId, expiresAt: { lt: now } } });
    const token = randomBytes(9).toString("base64url");
    const created = await this.prisma.sessionQrToken.create({
      data: {
        scheduleId: sesiId,
        token,
        expiresAt,
        createdBy: actorId,
        tanggal: scope?.tanggal ?? null,
        pertemuanKe: scope?.pertemuanKe ?? null,
      },
    });
    await this.audit.log({
      actorId,
      action: "CREATE_SESSION_QR",
      objectType: "Schedule",
      objectId: sesiId,
      newValue: { expiresAt, tanggal: scope?.tanggal ?? null, pertemuanKe: scope?.pertemuanKe ?? null },
    });
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
        where: { sesiId_userId_tanggal_pertemuanKe: { sesiId, userId: record.userId, tanggal: day, pertemuanKe: null } },
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

  /**
   * Instruktur membuat sesi absensi: memilih mata kuliah + kelas, menandai siapa hadir,
   * lalu menghasilkan token QR yang akan dipindai KM kelas untuk validasi.
   */
  async createInstrukturSession(
    body: {
      mataKuliahId: string;
      kelas: string;
      tanggal?: string;
      pertemuanKe?: number;
      materi?: string;
      records: { userId: string; status: string; reason?: string }[];
    },
    actor: SessionActor,
  ) {
    if (!body?.mataKuliahId || !body?.kelas) throw new BadRequestException("Mata kuliah dan kelas wajib diisi");
    if (!Array.isArray(body.records) || body.records.length === 0) throw new BadRequestException("Tidak ada anggota tim yang dipilih");

    const day = body.tanggal ? startOfJakartaDay(body.tanggal) : todayJakarta();
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Tanggal absensi tidak valid");
    const today = todayJakarta();
    if (day.getTime() > today.getTime()) throw new BadRequestException("Sesi belum dapat dibuat sebelum hari pelaksanaan");

    const hari = dayOfWeekJakarta(day);

    // Cari jadwal yang cocok: mata kuliah + kelas + hari + periode aktif
    const sesi = await this.prisma.schedule.findFirst({
      where: {
        deletedAt: null,
        status: "AKTIF",
        mataKuliahId: body.mataKuliahId,
        kelas: body.kelas,
        hari,
        tanggalMulai: { lte: day },
        tanggalSelesai: { gte: day },
      },
      include: {
        lab: { select: { id: true, kode: true, nama: true } },
        course: {
          select: { id: true, kode: true, nama: true, instrukturId: true, asistenIds: true },
        },
      },
    });
    if (!sesi) throw new NotFoundException("Jadwal praktikum tidak ditemukan untuk mata kuliah dan kelas ini pada hari ini");
    if (!sesi.course) throw new BadRequestException("Sesi belum tertaut dengan mata kuliah");

    // Hanya instruktur pengampu mata kuliah (atau admin) yang boleh membuat sesi
    if (actor.role !== "ADMIN_SYSTEM" && sesi.course.instrukturId !== actor.sub) {
      throw new ForbiddenException("Hanya instruktur pengampu mata kuliah ini yang dapat membuat sesi absensi");
    }

    // Validasi anggota yang diizinkan: instruktur + asdos
    const allowed = new Set<string>();
    if (sesi.course.instrukturId) allowed.add(sesi.course.instrukturId);
    for (const id of [...sesi.course.asistenIds, ...sesi.asistenIds]) allowed.add(id);

    // Tandai kehadiran setiap anggota
    const saved: any[] = [];
    for (const record of body.records) {
      if (!record?.userId || !allowed.has(record.userId)) {
        throw new BadRequestException("Anggota tim tidak terdaftar pada mata kuliah ini");
      }
      if (!ATTENDANCE_STATUSES.includes(record.status as TeamStatus)) {
        throw new BadRequestException("Status absensi tidak valid");
      }
      const reason = record.reason?.trim() || "Absensi tim pengajar oleh instruktur";
      const existing = await this.prisma.attendance.findUnique({
        where: { sesiId_userId_tanggal_pertemuanKe: { sesiId: sesi.id, userId: record.userId, tanggal: day, pertemuanKe: body.pertemuanKe ?? null } },
      });
      if (existing) {
        const updated = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: record.status as any,
            pertemuanKe: body.pertemuanKe ?? null,
            materi: body.materi ?? null,
            correctedBy: actor.sub,
            correctionReason: reason,
            oldValue: existing.status,
          },
        });
        await this.audit.log({
          actorId: actor.sub,
          action: "INSTRUKTUR_SESSION_CORRECTION",
          objectType: "Attendance",
          objectId: existing.id,
          oldValue: { status: existing.status },
          newValue: { status: record.status, sesiId: sesi.id, tanggal: day, pertemuanKe: body.pertemuanKe },
        });
        saved.push(updated);
      } else {
        const created = await this.prisma.attendance.create({
          data: {
            sesiId: sesi.id,
            userId: record.userId,
            labId: sesi.labId,
            tanggal: day,
            pertemuanKe: body.pertemuanKe ?? null,
            materi: body.materi ?? null,
            scannedAt: new Date(),
            status: record.status as any,
            qrTokenScanned: "INSTRUKTUR_SESSION",
            correctedBy: actor.sub,
            correctionReason: reason,
          },
        });
        await this.audit.log({
          actorId: actor.sub,
          action: "INSTRUKTUR_SESSION_CREATE",
          objectType: "Attendance",
          objectId: created.id,
          newValue: { userId: record.userId, status: record.status, sesiId: sesi.id, tanggal: day, pertemuanKe: body.pertemuanKe },
        });
        saved.push(created);
      }
    }

    // Buat token QR untuk sesi ini (berlaku 15 menit), terikat pada tanggal + pertemuan
    const tokenResult = await this.createSessionToken(sesi.id, actor.sub, {
      tanggal: day,
      pertemuanKe: body.pertemuanKe ?? null,
    });

    return {
      ok: true,
      date: day.toISOString().slice(0, 10),
      pertemuanKe: body.pertemuanKe,
      materi: body.materi,
      sesi: {
        id: sesi.id,
        mataKuliah: sesi.course.nama,
        kode: sesi.course.kode,
        kelas: sesi.kelas,
        semester: sesi.semester,
        jamMulai: sesi.jamMulai,
        jamSelesai: sesi.jamSelesai,
        lab: sesi.lab,
      },
      qrToken: tokenResult.token,
      qrExpiresAt: tokenResult.expiresAt,
      marked: saved.length,
      records: saved.map((r) => ({ userId: r.userId, status: r.status })),
    };
  }

  /**
   * Validasi token QR yang dipindai KM kelas. Mengembalikan data sesi dan
   * daftar anggota yang telah ditandai oleh instruktur.
   */
  async validateScan(qrToken: string, actorId: string) {
    if (!qrToken || !qrToken.trim()) throw new BadRequestException("QR code tidak valid");
    const now = new Date();

    const token = await this.prisma.sessionQrToken.findUnique({
      where: { token: qrToken.trim() },
      include: {
        schedule: {
          include: {
            lab: { select: { id: true, kode: true, nama: true } },
            course: { select: { id: true, kode: true, nama: true, instrukturId: true, asistenIds: true } },
          },
        },
      },
    });
    if (!token || token.expiresAt <= now) throw new BadRequestException("QR code tidak valid atau sudah kedaluwarsa");
    const s = token.schedule;
    if (s.deletedAt || s.status !== "AKTIF") throw new BadRequestException("Sesi praktikum tidak aktif");

    const day = startOfJakartaDay(token.tanggal ?? token.createdAt);
    const atts = await this.prisma.attendance.findMany({
      where: {
        sesiId: s.id,
        tanggal: day,
        deletedAt: null,
        ...(token.pertemuanKe != null ? { pertemuanKe: token.pertemuanKe } : {}),
      },
      include: { user: { select: { id: true, nama: true, email: true, subRoles: true } } },
      orderBy: { user: { nama: "asc" } },
    });

    const members = atts.map((a) => ({
      id: a.user.id,
      nama: a.user.nama,
      email: a.user.email,
      peran: a.user.subRoles.includes("INSTRUKTUR") ? "INSTRUKTUR" : a.user.subRoles.includes("ASISTEN_DOSEN") ? "ASISTEN_DOSEN" : "LAINNYA",
      status: a.status,
      pertemuanKe: a.pertemuanKe,
      materi: a.materi,
      validatedBy: a.validatedBy,
      validatedAt: a.validatedAt,
    }));

    // Tandai sudah dipindai (audit only, tidak mengubah status kehadiran)
    await this.audit.log({
      actorId,
      action: "QR_VALIDATE_SCAN",
      objectType: "SessionQrToken",
      objectId: token.id,
      newValue: { sesiId: s.id, scannedBy: actorId, scannedAt: now },
    });

    return {
      valid: true,
      tokenId: token.id,
      expiresAt: token.expiresAt,
      sesi: {
        id: s.id,
        mataKuliah: s.course?.nama ?? s.mataKuliah,
        kode: s.course?.kode ?? null,
        kelas: s.kelas,
        semester: s.semester,
        jamMulai: s.jamMulai,
        jamSelesai: s.jamSelesai,
        lab: s.lab,
      },
      scannedAt: now,
      scannedBy: actorId,
      pertemuanKe: token.pertemuanKe ?? members[0]?.pertemuanKe ?? null,
      materi: members.find((m) => m.materi)?.materi ?? null,
      members,
      totalHadir: members.filter((m) => m.status === "HADIR").length,
      totalMembers: members.length,
    };
  }

  /**
   * KM kelas mengonfirmasi validasi kehadiran setelah memindai QR.
   * Menandai attendance records sebagai divalidasi oleh petugas scan.
   */
  async confirmValidation(qrToken: string, actorId: string) {
    if (!qrToken || !qrToken.trim()) throw new BadRequestException("QR code tidak valid");
    const now = new Date();

    const token = await this.prisma.sessionQrToken.findUnique({
      where: { token: qrToken.trim() },
      include: { schedule: true },
    });
    if (!token || token.expiresAt <= now) throw new BadRequestException("QR code tidak valid atau sudah kedaluwarsa");
    const s = token.schedule;
    if (s.deletedAt || s.status !== "AKTIF") throw new BadRequestException("Sesi praktikum tidak aktif");

    const day = startOfJakartaDay(token.tanggal ?? token.createdAt);

    const atts = await this.prisma.attendance.findMany({
      where: {
        sesiId: s.id,
        tanggal: day,
        deletedAt: null,
        ...(token.pertemuanKe != null ? { pertemuanKe: token.pertemuanKe } : {}),
      },
    });

    for (const a of atts) {
      await this.prisma.attendance.update({
        where: { id: a.id },
        data: { validatedBy: actorId, validatedAt: now, validationSource: "QR_KM" },
      });
      await this.audit.log({
        actorId,
        action: "QR_VALIDATE_CONFIRM",
        objectType: "Attendance",
        objectId: a.id,
        newValue: { validatedBy: actorId, validatedAt: now, validationSource: "QR_KM" },
      });
    }

    return { ok: true, sesiId: s.id, validated: atts.length, date: day.toISOString().slice(0, 10) };
  }

  /** Daftar mata kuliah yang diampu instruktur atau diikuti asisten dosen (untuk dropdown pembuatan sesi). */
  async instrukturCourses(actorId: string) {
    const courses = await this.prisma.mataKuliah.findMany({
      where: {
        deletedAt: null,
        status: "AKTIF",
        OR: [{ instrukturId: actorId }, { asistenIds: { has: actorId } }],
      },
      select: { id: true, kode: true, nama: true, asistenIds: true, instrukturId: true },
      orderBy: { kode: "asc" },
    });
    // Ambil daftar kelas unik dari jadwal aktif hari ini dan mendatang
    const today = todayJakarta();
    const todayDow = dayOfWeekJakarta(today);
    const schedules = await this.prisma.schedule.findMany({
      where: {
        mataKuliahId: { in: courses.map((c) => c.id) },
        deletedAt: null,
        status: "AKTIF",
        tanggalSelesai: { gte: today },
      },
      select: {
        mataKuliahId: true,
        kelas: true,
        hari: true,
        jamMulai: true,
        jamSelesai: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        lab: { select: { kode: true } },
      },
      orderBy: { jamMulai: "asc" },
    });
    const kelasByCourse = new Map<string, Set<string>>();
    const jadwalHariIniByCourse = new Map<string, Array<{ kelas: string; jamMulai: string; jamSelesai: string; labKode: string | null }>>();
    for (const s of schedules) {
      if (!kelasByCourse.has(s.mataKuliahId)) kelasByCourse.set(s.mataKuliahId, new Set());
      kelasByCourse.get(s.mataKuliahId)!.add(s.kelas);
      if (s.hari === todayDow && s.tanggalMulai <= today && s.tanggalSelesai >= today) {
        if (!jadwalHariIniByCourse.has(s.mataKuliahId)) jadwalHariIniByCourse.set(s.mataKuliahId, []);
        jadwalHariIniByCourse.get(s.mataKuliahId)!.push({
          kelas: s.kelas,
          jamMulai: s.jamMulai,
          jamSelesai: s.jamSelesai,
          labKode: s.lab?.kode ?? null,
        });
      }
    }
    const results = await Promise.all(
      courses.map(async (c) => {
        const userDetails: Record<string, { nama: string; email: string; subRoles: string[] }> = {};
        const allIds = new Set<string>([c.instrukturId, ...c.asistenIds]);
        for (const id of allIds) {
          if (!id) continue;
          const u = await this.prisma.user.findUnique({
            where: { id },
            select: { nama: true, email: true, subRoles: true },
          });
          if (u) userDetails[id] = u;
        }
        return {
          id: c.id,
          kode: c.kode,
          nama: c.nama,
          instrukturId: c.instrukturId,
          asistenIds: c.asistenIds,
          kelas: [...(kelasByCourse.get(c.id) || [])].sort(),
          jadwalHariIni: jadwalHariIniByCourse.get(c.id) || [],
          asistenCount: c.asistenIds.length,
          team: [
            c.instrukturId ? { id: c.instrukturId, ...userDetails[c.instrukturId], peran: "INSTRUKTUR" } : null,
            ...c.asistenIds.map((id) => ({ id, ...userDetails[id], peran: "ASISTEN_DOSEN" })),
          ].filter(Boolean),
        };
      }),
    );
    return results;
  }

  /** Riwayat sesi absensi yang dibuat oleh instruktur atau asisten dosen (dikelompokkan per sesi + tanggal + pertemuan). */
  async instrukturSessions(actorId: string, limit = 20) {
    const rows = await this.prisma.attendance.findMany({
      where: {
        deletedAt: null,
        qrTokenScanned: "INSTRUKTUR_SESSION",
        OR: [
          { sesi: { course: { instrukturId: actorId } } },
          { sesi: { course: { asistenIds: { has: actorId } } } },
          { sesi: { asistenIds: { has: actorId } } },
        ],
      },
      include: {
        sesi: {
          select: {
            id: true,
            mataKuliah: true,
            mataKuliahId: true,
            kelas: true,
            jamMulai: true,
            jamSelesai: true,
            lab: { select: { kode: true } },
          },
        },
        user: { select: { id: true, nama: true, subRoles: true } },
      },
      orderBy: [{ tanggal: "desc" }, { pertemuanKe: "desc" }],
    });

    const groups = new Map<string, any>();
    for (const row of rows) {
      const tanggal = row.tanggal ? row.tanggal.toISOString().slice(0, 10) : null;
      const key = `${row.sesiId}|${tanggal ?? "-"}|${row.pertemuanKe ?? 0}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          sesiId: row.sesiId,
          mataKuliahId: row.sesi.mataKuliahId,
          mataKuliah: row.sesi.mataKuliah,
          kelas: row.sesi.kelas,
          labKode: row.sesi.lab?.kode ?? null,
          jamMulai: row.sesi.jamMulai,
          jamSelesai: row.sesi.jamSelesai,
          tanggal,
          pertemuanKe: row.pertemuanKe,
          materi: row.materi,
          total: 0,
          hadir: 0,
          validated: 0,
          members: [] as Array<{ id: string; nama: string; status: string; validated: boolean }>,
        });
      }
      const group = groups.get(key);
      group.total += 1;
      if (row.status === "HADIR") group.hadir += 1;
      if (row.validatedAt) group.validated += 1;
      group.members.push({
        id: row.user.id,
        nama: row.user.nama,
        status: row.status,
        validated: !!row.validatedAt,
      });
      if (!group.materi && row.materi) group.materi = row.materi;
    }

    return [...groups.values()].slice(0, limit);
  }

  /** Admin: KPI absensi keseluruhan. */
  async adminStats() {
    const [totalSessions, totalAttendance, hadirCount] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ["sesiId"],
        where: { deletedAt: null },
        _count: { sesiId: true },
      }),
      this.prisma.attendance.count({ where: { deletedAt: null } }),
      this.prisma.attendance.count({ where: { deletedAt: null, status: "HADIR" } }),
    ]);

    // Count distinct sesi with attendance
    const distinctSesi = new Set(totalSessions.map((s) => s.sesiId));

    // Get all attendance records to compute per-course stats
    const allAtts = await this.prisma.attendance.findMany({
      where: { deletedAt: null },
      include: {
        sesi: { select: { mataKuliah: true, kelas: true, mataKuliahId: true } },
        user: { select: { nama: true, email: true, subRoles: true } },
      },
    });

    // Group by mataKuliahId
    const byCourse: Record<string, { kode: string; nama: string; total: number; hadir: number; pertemuan: Set<number> }> = {};
    for (const a of allAtts) {
      const mkId = a.sesi.mataKuliahId;
      if (!mkId) continue;
      if (!byCourse[mkId]) {
        byCourse[mkId] = {
          kode: a.sesi.mataKuliah,
          nama: a.sesi.mataKuliah,
          total: 0,
          hadir: 0,
          pertemuan: new Set(),
        };
      }
      byCourse[mkId].total += 1;
      if (a.status === "HADIR") byCourse[mkId].hadir += 1;
      if (a.pertemuanKe != null) byCourse[mkId].pertemuan.add(a.pertemuanKe);
    }

    return {
      totalSessions: distinctSesi.size,
      totalAttendance: totalAttendance,
      hadirCount,
      notHadirCount: totalAttendance - hadirCount,
      hadirRate: totalAttendance > 0 ? Math.round((hadirCount / totalAttendance) * 100) : 0,
      courses: Object.values(byCourse).map((c) => ({
        kode: c.kode,
        nama: c.nama,
        total: c.total,
        hadir: c.hadir,
        notHadir: c.total - c.hadir,
        pertemuanCount: c.pertemuan.size,
        hadirRate: c.total > 0 ? Math.round((c.hadir / c.total) * 100) : 0,
      })),
    };
  }

  /** Admin: daftar mata kuliah dengan ringkasan absensi. */
  async adminCourses() {
    const atts = await this.prisma.attendance.findMany({
      where: { deletedAt: null },
      include: {
        sesi: { select: { mataKuliahId: true, mataKuliah: true, kelas: true } },
        user: { select: { nama: true, subRoles: true } },
      },
      orderBy: { scannedAt: "desc" },
    });

    const byCourse: Record<string, {
      id: string; kode: string; nama: string; total: number; hadir: number;
      instruktur: Set<string>; asdos: Set<string>; pertemuan: Set<number>;
    }> = {};

    for (const a of atts) {
      const mkId = a.sesi.mataKuliahId;
      if (!mkId) continue;
      if (!byCourse[mkId]) {
        byCourse[mkId] = {
          id: mkId,
          kode: a.sesi.mataKuliah,
          nama: a.sesi.mataKuliah,
          total: 0, hadir: 0,
          instruktur: new Set(), asdos: new Set(), pertemuan: new Set(),
        };
      }
      byCourse[mkId].total += 1;
      if (a.status === "HADIR") byCourse[mkId].hadir += 1;
      if (a.user.subRoles.includes("INSTRUKTUR")) byCourse[mkId].instruktur.add(a.userId);
      if (a.user.subRoles.includes("ASISTEN_DOSEN")) byCourse[mkId].asdos.add(a.userId);
      if (a.pertemuanKe != null) byCourse[mkId].pertemuan.add(a.pertemuanKe);
    }

    return Object.values(byCourse).map((c) => ({
      id: c.id,
      kode: c.kode,
      nama: c.nama,
      total: c.total,
      hadir: c.hadir,
      notHadir: c.total - c.hadir,
      hadirRate: c.total > 0 ? Math.round((c.hadir / c.total) * 100) : 0,
      instrukturCount: c.instruktur.size,
      asdosCount: c.asdos.size,
      pertemuanCount: c.pertemuan.size,
    }));
  }

  /** Admin: detail absensi per mata kuliah per pertemuan (instruktur + asdos). */
  async adminCourseDetail(courseId: string) {
    const atts = await this.prisma.attendance.findMany({
      where: { deletedAt: null, sesi: { mataKuliahId: courseId } },
      include: {
        sesi: { select: { id: true, mataKuliah: true, kelas: true, hari: true, jamMulai: true, jamSelesai: true, tanggalMulai: true, tanggalSelesai: true } },
        user: { select: { id: true, nama: true, email: true, subRoles: true } },
      },
      orderBy: [{ scannedAt: "asc" }],
    });

    // Group by pertemuanKe
    const byPertemuan: Record<number, {
      pertemuanKe: number; total: number; hadir: number;
      instruktur: Array<{ id: string; nama: string; status: string }>;
      asdos: Array<{ id: string; nama: string; status: string }>;
    }> = {};

    let courseNama = "";
    let courseKode = "";

    for (const a of atts) {
      if (!courseNama) {
        courseNama = a.sesi.mataKuliah;
        courseKode = a.sesi.mataKuliah;
      }
      const pk = a.pertemuanKe ?? 0;
      if (!byPertemuan[pk]) {
        byPertemuan[pk] = {
          pertemuanKe: pk, total: 0, hadir: 0,
          instruktur: [], asdos: [],
        };
      }
      byPertemuan[pk].total += 1;
      if (a.status === "HADIR") byPertemuan[pk].hadir += 1;
      const member = { id: a.userId, nama: a.user.nama, status: a.status };
      if (a.user.subRoles.includes("INSTRUKTUR")) byPertemuan[pk].instruktur.push(member);
      if (a.user.subRoles.includes("ASISTEN_DOSEN")) byPertemuan[pk].asdos.push(member);
    }

    return {
      courseId,
      kode: courseKode,
      nama: courseNama,
      pertemuan: Object.values(byPertemuan).sort((a, b) => a.pertemuanKe - b.pertemuanKe),
    };
  }

  async manual(sesiId: string, userId: string, status: string, reason: string, actorId: string, tanggal?: string) {
    if (!reason || !reason.trim()) throw new BadRequestException("Alasan wajib diisi");
    if (!ATTENDANCE_STATUSES.includes(status as TeamStatus)) throw new BadRequestException("Status absensi tidak valid");
    const sesi = await this.prisma.schedule.findUnique({ where: { id: sesiId } });
    if (!sesi) throw new NotFoundException("Sesi tidak ditemukan");
    const day = tanggal ? startOfJakartaDay(tanggal) : todayJakarta();
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Tanggal absensi tidak valid");
    const existing = await this.prisma.attendance.findUnique({
      where: { sesiId_userId_tanggal_pertemuanKe: { sesiId, userId, tanggal: day, pertemuanKe: null } },
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
