import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { startOfJakartaDay } from "../common/time";
import { findScheduleConflict, timeToMin } from "../common/schedule-conflict";

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  findAll(q: { labId?: string; pengampuId?: string; hari?: number; semester?: string; page?: string; limit?: string }) {
    const where: any = { deletedAt: null, status: "AKTIF" };
    if (q.labId) where.labId = q.labId;
    if (q.pengampuId) where.pengampuId = q.pengampuId;
    if (q.hari !== undefined && q.hari !== null && (q.hari as any) !== "") where.hari = Number(q.hari);
    if (q.semester) where.semester = q.semester;
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(q.limit) || 200));
    return this.prisma.schedule.findMany({
      where,
      include: {
        lab: { select: { kode: true, nama: true } },
        pengampu: { select: { id: true, nama: true, email: true } },
        course: { select: { id: true, kode: true, nama: true, instruktur: { select: { id: true, nama: true } } } },
      },
      orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }).then(async (schedules) => {
      // attach asisten users
      const ids = Array.from(new Set(schedules.flatMap((s) => s.asistenIds || [])));
      const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nama: true, email: true } }) : [];
      const map = Object.fromEntries(users.map((u) => [u.id, u]));
      return schedules.map((s) => ({ ...s, asisten: (s.asistenIds || []).map((id) => map[id]).filter(Boolean) }));
    });
  }

  findOne(id: string) {
    return this.prisma.schedule.findUnique({ where: { id }, include: { lab: true, pengampu: true, course: { include: { dosen: { select: { id: true, nama: true } }, instruktur: { select: { id: true, nama: true } } } } } }).then(async (s) => {
      if (!s) return s;
      const users = s.asistenIds?.length ? await this.prisma.user.findMany({ where: { id: { in: s.asistenIds } }, select: { id: true, nama: true, email: true } }) : [];
      return { ...s, asisten: users };
    });
  }

  /** Jadwal yang relevan untuk satu pengguna: sebagai pengampu, asisten, instruktur mata kuliah, atau peserta terdaftar. */
  async findMine(userId: string) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        deletedAt: null,
        status: "AKTIF",
        OR: [
          { pengampuId: userId },
          { asistenIds: { has: userId } },
          { course: { instrukturId: userId, deletedAt: null } },
          { enrollments: { some: { userId, deletedAt: null } } },
        ],
      },
      include: {
        lab: { select: { kode: true, nama: true } },
        pengampu: { select: { id: true, nama: true, email: true } },
        course: { select: { id: true, kode: true, nama: true, instruktur: { select: { id: true, nama: true } } } },
      },
      orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
    });
    const ids = Array.from(new Set(schedules.flatMap((s) => s.asistenIds || [])));
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nama: true, email: true } }) : [];
    const map = Object.fromEntries(users.map((u) => [u.id, u]));
    return schedules.map((s) => ({ ...s, asisten: (s.asistenIds || []).map((id) => map[id]).filter(Boolean) }));
  }

  checkConflict(params: { labId: string; hari: number; jamMulai: string; jamSelesai: string; tanggalMulai: Date; tanggalSelesai: Date; excludeId?: string }) {
    return findScheduleConflict(this.prisma, params);
  }

  async create(data: any, actorId?: string) {
    const tanggalMulai = startOfJakartaDay(data.tanggalMulai);
    const tanggalSelesai = startOfJakartaDay(data.tanggalSelesai);
    if (Number.isNaN(tanggalMulai.getTime()) || Number.isNaN(tanggalSelesai.getTime())) throw new BadRequestException("Tanggal tidak valid");
    if (tanggalMulai > tanggalSelesai) throw new BadRequestException("Tanggal mulai harus sebelum tanggal selesai");
    if (timeToMin(data.jamMulai) >= timeToMin(data.jamSelesai)) throw new BadRequestException("Jam mulai harus sebelum jam selesai");
    if (Number(data.hari) < 0 || Number(data.hari) > 6) throw new BadRequestException("Hari tidak valid");
    const c = await this.checkConflict({ labId: data.labId, hari: Number(data.hari), jamMulai: data.jamMulai, jamSelesai: data.jamSelesai, tanggalMulai, tanggalSelesai });
    if (c.conflict) throw new BadRequestException(`Bentrok dengan ${c.type === "jadwal" ? "jadwal" : "peminjaman"} lain pada lab & jam yang sama`);
    const sch = await this.prisma.schedule.create({
      data: {
        labId: data.labId,
        mataKuliahId: data.mataKuliahId || null,
        mataKuliah: data.mataKuliah,
        kelas: data.kelas,
        pengampuId: data.pengampuId || null,
        asistenIds: (data.asistenIds || []).filter(Boolean),
        hari: Number(data.hari),
        jamMulai: data.jamMulai,
        jamSelesai: data.jamSelesai,
        tanggalMulai,
        tanggalSelesai,
        semester: data.semester,
        jenis: data.jenis || "PRAKTIKUM_RUTIN",
        status: "AKTIF",
      },
    });
    if (actorId) await this.audit.log({ actorId, action: "CREATE_SCHEDULE", objectType: "Schedule", objectId: sch.id, newValue: sch });
    return sch;
  }

  async update(id: string, data: any, actorId?: string) {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException("Jadwal tidak ditemukan");
    const tanggalMulai = data.tanggalMulai ? startOfJakartaDay(data.tanggalMulai) : existing.tanggalMulai;
    const tanggalSelesai = data.tanggalSelesai ? startOfJakartaDay(data.tanggalSelesai) : existing.tanggalSelesai;
    const hari = data.hari !== undefined ? Number(data.hari) : existing.hari;
    if (hari < 0 || hari > 6) throw new BadRequestException("Hari tidak valid");
    const jamMulai = data.jamMulai || existing.jamMulai;
    const jamSelesai = data.jamSelesai || existing.jamSelesai;
    const labId = data.labId || existing.labId;
    if (timeToMin(jamMulai) >= timeToMin(jamSelesai)) throw new BadRequestException("Jam mulai harus sebelum jam selesai");
    const c = await this.checkConflict({ labId, hari, jamMulai, jamSelesai, tanggalMulai, tanggalSelesai, excludeId: id });
    if (c.conflict) throw new BadRequestException(`Bentrok dengan ${c.type === "jadwal" ? "jadwal" : "peminjaman"} lain`);
    const sch = await this.prisma.schedule.update({
      where: { id },
      data: {
        labId,
        mataKuliahId: data.mataKuliahId !== undefined ? (data.mataKuliahId || null) : existing.mataKuliahId,
        mataKuliah: data.mataKuliah ?? existing.mataKuliah,
        kelas: data.kelas ?? existing.kelas,
        pengampuId: data.pengampuId !== undefined ? (data.pengampuId || null) : existing.pengampuId,
        asistenIds: data.asistenIds !== undefined ? (data.asistenIds || []).filter(Boolean) : existing.asistenIds,
        hari,
        jamMulai,
        jamSelesai,
        tanggalMulai,
        tanggalSelesai,
        semester: data.semester ?? existing.semester,
        jenis: data.jenis ?? existing.jenis,
        status: data.status ?? existing.status,
      },
    });
    if (actorId) await this.audit.log({ actorId, action: "UPDATE_SCHEDULE", objectType: "Schedule", objectId: id, oldValue: existing, newValue: sch });
    return sch;
  }

  async remove(id: string, actorId?: string) {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jadwal tidak ditemukan");
    const sch = await this.prisma.schedule.update({ where: { id }, data: { deletedAt: new Date(), status: "DIBATALKAN" } });
    if (actorId) await this.audit.log({ actorId, action: "DELETE_SCHEDULE", objectType: "Schedule", objectId: id, oldValue: existing });
    return { ok: true };
  }

  async duplicate(id: string, params: { tanggalMulai: string; tanggalSelesai: string; semester?: string }, actorId?: string) {
    const src = await this.prisma.schedule.findUnique({ where: { id } });
    if (!src) throw new NotFoundException("Jadwal tidak ditemukan");
    return this.create({
      labId: src.labId,
      mataKuliahId: src.mataKuliahId,
      mataKuliah: src.mataKuliah,
      kelas: src.kelas,
      pengampuId: src.pengampuId,
      hari: src.hari,
      jamMulai: src.jamMulai,
      jamSelesai: src.jamSelesai,
      tanggalMulai: params.tanggalMulai,
      tanggalSelesai: params.tanggalSelesai,
      semester: params.semester || src.semester,
      jenis: src.jenis,
    }, actorId);
  }

  async importCsv(rows: { labKode: string; mataKuliah: string; kelas: string; pengampuEmail?: string; hari: number; jamMulai: string; jamSelesai: string; tanggalMulai: string; tanggalSelesai: string; semester: string; jenis?: string }[], actorId?: string) {
    const results: { row: number; status: "ok" | "error"; message?: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const lab = await this.prisma.lab.findUnique({ where: { kode: r.labKode } });
        if (!lab) throw new BadRequestException("Lab tidak ditemukan");
        let pengampuId: string | undefined;
        if (r.pengampuEmail) {
          const u = await this.prisma.user.findUnique({ where: { email: r.pengampuEmail } });
          if (u) pengampuId = u.id;
        }
        await this.create({ labId: lab.id, mataKuliah: r.mataKuliah, kelas: r.kelas, pengampuId, hari: Number(r.hari), jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, tanggalMulai: r.tanggalMulai, tanggalSelesai: r.tanggalSelesai, semester: r.semester, jenis: r.jenis }, actorId);
        results.push({ row: i + 1, status: "ok" });
      } catch (e: any) {
        results.push({ row: i + 1, status: "error", message: e?.message || "Gagal" });
      }
    }
    return results;
  }
}
