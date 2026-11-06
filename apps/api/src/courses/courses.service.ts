import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { startOfJakartaDay } from "../common/time";
import { daysOverlap, findScheduleConflict, timeOverlap, timeToMin } from "../common/schedule-conflict";

const PERSONEL_SELECT = { id: true, nama: true, email: true } as const;
const PERSONEL_ROLES = ["DOSEN", "INSTRUKTUR", "ASISTEN_DOSEN"] as const;
type PersonelRole = (typeof PERSONEL_ROLES)[number];

type KelasInput = {
  nama?: string;
  labId?: string;
  hari?: number | string;
  jamMulai?: string;
  jamSelesai?: string;
  tanggalMulai?: string | Date;
  tanggalSelesai?: string | Date;
  semester?: string;
};

type NormalizedKelas = {
  nama: string;
  labId: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  semester: string;
};

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Daftar mata kuliah beserta tim pengajar dan kelas jadwalnya. */
  async findAll(q: { search?: string; status?: string; semester?: string } = {}) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.semester) where.semester = Number(q.semester);
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { kode: { contains: s, mode: "insensitive" } },
        { nama: { contains: s, mode: "insensitive" } },
      ];
    }
    const courses = await this.prisma.mataKuliah.findMany({
      where,
      include: {
        dosen: { select: PERSONEL_SELECT },
        instruktur: { select: PERSONEL_SELECT },
        schedules: {
          where: { deletedAt: null, status: "AKTIF" },
          include: { lab: { select: { id: true, kode: true, nama: true } } },
          orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
        },
      },
      orderBy: [{ status: "asc" }, { kode: "asc" }],
    });
    return this.attachAsisten(courses);
  }

  async findOne(id: string) {
    const course = await this.prisma.mataKuliah.findFirst({
      where: { id, deletedAt: null },
      include: {
        dosen: { select: PERSONEL_SELECT },
        instruktur: { select: PERSONEL_SELECT },
        schedules: {
          where: { deletedAt: null, status: "AKTIF" },
          include: { lab: { select: { id: true, kode: true, nama: true } } },
          orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
        },
      },
    });
    if (!course) throw new NotFoundException("Mata kuliah tidak ditemukan");
    const [shaped] = await this.attachAsisten([course]);
    return shaped;
  }

  async create(data: any, actorId?: string) {
    const kode = String(data?.kode || "").trim();
    const nama = String(data?.nama || "").trim();
    if (!kode) throw new BadRequestException("Kode mata kuliah wajib diisi");
    if (!nama) throw new BadRequestException("Nama mata kuliah wajib diisi");

    const duplicate = await this.prisma.mataKuliah.findUnique({ where: { kode } });
    if (duplicate) throw new BadRequestException(`Kode ${kode} sudah dipakai mata kuliah lain`);

    const sks = this.intInRange(data?.sks, 3, 1, 12, "SKS");
    const semester = this.intInRange(data?.semester, 1, 1, 14, "Semester");
    const dosenId = data?.dosenId || null;
    const instrukturId = data?.instrukturId || null;
    const asistenIds = this.cleanIds(data?.asistenIds);
    await this.validatePersonel({ dosenId, instrukturId, asistenIds });

    const kelas = await this.normalizeKelas(Array.isArray(data?.kelas) ? data.kelas : []);
    for (const k of kelas) await this.assertNoConflict(k);

    const id = await this.prisma.$transaction(async (tx) => {
      const course = await tx.mataKuliah.create({
        data: {
          kode,
          nama,
          sks,
          semester,
          dosenId,
          instrukturId,
          asistenIds,
          deskripsi: data?.deskripsi ? String(data.deskripsi) : null,
        },
      });
      for (const k of kelas) {
        await tx.schedule.create({ data: this.toSchedule(course, k) });
      }
      return course.id;
    });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: "CREATE_MATA_KULIAH",
        objectType: "MataKuliah",
        objectId: id,
        newValue: { kode, nama, dosenId, instrukturId, asistenIds, kelas: kelas.map((k) => k.nama) },
      });
    }
    return this.findOne(id);
  }

  async update(id: string, data: any, actorId?: string) {
    const existing = await this.prisma.mataKuliah.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException("Mata kuliah tidak ditemukan");

    const kode = data?.kode !== undefined ? String(data.kode).trim() : existing.kode;
    if (!kode) throw new BadRequestException("Kode mata kuliah wajib diisi");
    if (kode !== existing.kode) {
      const duplicate = await this.prisma.mataKuliah.findUnique({ where: { kode } });
      if (duplicate) throw new BadRequestException(`Kode ${kode} sudah dipakai mata kuliah lain`);
    }

    const nama = data?.nama !== undefined ? String(data.nama).trim() : existing.nama;
    if (!nama) throw new BadRequestException("Nama mata kuliah wajib diisi");
    const sks = data?.sks !== undefined ? this.intInRange(data.sks, existing.sks, 1, 12, "SKS") : existing.sks;
    const semester =
      data?.semester !== undefined ? this.intInRange(data.semester, existing.semester, 1, 14, "Semester") : existing.semester;
    const dosenId = data?.dosenId !== undefined ? data.dosenId || null : existing.dosenId;
    const instrukturId = data?.instrukturId !== undefined ? data.instrukturId || null : existing.instrukturId;
    const asistenIds = data?.asistenIds !== undefined ? this.cleanIds(data.asistenIds) : existing.asistenIds;
    const status = data?.status !== undefined ? data.status : existing.status;
    if (!["AKTIF", "NONAKTIF"].includes(status)) throw new BadRequestException("Status mata kuliah tidak valid");
    await this.validatePersonel({ dosenId, instrukturId, asistenIds });

    await this.prisma.$transaction(async (tx) => {
      await tx.mataKuliah.update({
        where: { id },
        data: {
          kode,
          nama,
          sks,
          semester,
          dosenId,
          instrukturId,
          asistenIds,
          status,
          deskripsi: data?.deskripsi !== undefined ? data.deskripsi || null : existing.deskripsi,
        },
      });
      // Tim pengajar dan nama mata kuliah dipakai bersama oleh semua kelas.
      // Pengampu sesi praktikum adalah instruktur; dosen hanya menjadi cadangan
      // bila mata kuliah belum memiliki instruktur.
      await tx.schedule.updateMany({
        where: { mataKuliahId: id, deletedAt: null },
        data: {
          mataKuliah: nama,
          pengampuId: instrukturId ?? dosenId,
          asistenIds,
          status: status === "NONAKTIF" ? "DIBATALKAN" : "AKTIF",
        },
      });
    });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: "UPDATE_MATA_KULIAH",
        objectType: "MataKuliah",
        objectId: id,
        oldValue: existing,
        newValue: { kode, nama, sks, semester, dosenId, instrukturId, asistenIds, status },
      });
    }
    return this.findOne(id);
  }

  async remove(id: string, actorId?: string) {
    const existing = await this.prisma.mataKuliah.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException("Mata kuliah tidak ditemukan");

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.schedule.updateMany({
        where: { mataKuliahId: id, deletedAt: null },
        data: { status: "DIBATALKAN", deletedAt: now },
      }),
      this.prisma.mataKuliah.update({
        where: { id },
        data: { status: "NONAKTIF", deletedAt: now },
      }),
    ]);

    if (actorId) {
      await this.audit.log({
        actorId,
        action: "DELETE_MATA_KULIAH",
        objectType: "MataKuliah",
        objectId: id,
        oldValue: existing,
      });
    }
    return { ok: true };
  }

  // ------------------------------------------------------------- kelas

  async createKelas(courseId: string, data: KelasInput, actorId?: string) {
    const course = await this.requireCourse(courseId);
    const [kelas] = await this.normalizeKelas([data]);
    await this.assertKelasNameFree(courseId, kelas.nama);
    await this.assertNoConflict(kelas);

    const created = await this.prisma.schedule.create({ data: this.toSchedule(course, kelas) });
    if (actorId) {
      await this.audit.log({
        actorId,
        action: "CREATE_KELAS",
        objectType: "Schedule",
        objectId: created.id,
        newValue: { mataKuliahId: courseId, kelas: kelas.nama, labId: kelas.labId },
      });
    }
    return created;
  }

  async updateKelas(courseId: string, scheduleId: string, data: KelasInput, actorId?: string) {
    await this.requireCourse(courseId);
    const existing = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, mataKuliahId: courseId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("Kelas tidak ditemukan pada mata kuliah ini");

    const [kelas] = await this.normalizeKelas([
      {
        nama: data.nama ?? existing.kelas,
        labId: data.labId ?? existing.labId,
        hari: data.hari ?? existing.hari,
        jamMulai: data.jamMulai ?? existing.jamMulai,
        jamSelesai: data.jamSelesai ?? existing.jamSelesai,
        tanggalMulai: data.tanggalMulai ?? existing.tanggalMulai.toISOString(),
        tanggalSelesai: data.tanggalSelesai ?? existing.tanggalSelesai.toISOString(),
        semester: data.semester ?? existing.semester,
      },
    ]);
    await this.assertKelasNameFree(courseId, kelas.nama, scheduleId);
    await this.assertNoConflict(kelas, scheduleId);

    const updated = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        kelas: kelas.nama,
        labId: kelas.labId,
        hari: kelas.hari,
        jamMulai: kelas.jamMulai,
        jamSelesai: kelas.jamSelesai,
        tanggalMulai: kelas.tanggalMulai,
        tanggalSelesai: kelas.tanggalSelesai,
        semester: kelas.semester,
      },
    });
    if (actorId) {
      await this.audit.log({
        actorId,
        action: "UPDATE_KELAS",
        objectType: "Schedule",
        objectId: scheduleId,
        oldValue: existing,
        newValue: updated,
      });
    }
    return updated;
  }

  async removeKelas(courseId: string, scheduleId: string, actorId?: string) {
    const existing = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, mataKuliahId: courseId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("Kelas tidak ditemukan pada mata kuliah ini");
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: "DIBATALKAN", deletedAt: new Date() },
    });
    if (actorId) {
      await this.audit.log({
        actorId,
        action: "DELETE_KELAS",
        objectType: "Schedule",
        objectId: scheduleId,
        oldValue: existing,
      });
    }
    return { ok: true };
  }

  // ---------------------------------------------------------- personel

  /** Tambah personel pengajar langsung dari form mata kuliah. */
  async createPersonel(data: any, actorId?: string) {
    const nama = String(data?.nama || "").trim();
    const email = String(data?.email || "").trim().toLowerCase();
    const tipe = String(data?.tipe || "").trim() as PersonelRole;
    if (!nama) throw new BadRequestException("Nama personel wajib diisi");
    if (!email) throw new BadRequestException("Email personel wajib diisi");
    if (!PERSONEL_ROLES.includes(tipe)) throw new BadRequestException("Tipe personel tidak valid");

    const duplicate = await this.prisma.user.findUnique({ where: { email } });
    if (duplicate) throw new BadRequestException("Email sudah terdaftar");

    const password = String(data?.password || "Labops123");
    if (password.length < 6) throw new BadRequestException("Kata sandi minimal 6 karakter");
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        nama,
        email,
        passwordHash,
        // Dosen tetap pengguna biasa (sub-peran DOSEN), sedangkan instruktur
        // dan asisten dosen kini memakai peran langsung.
        role: tipe === "DOSEN" ? "USER" : tipe,
        subRoles: [tipe],
      },
      select: { id: true, nama: true, email: true, role: true, subRoles: true, status: true },
    });
    if (actorId) {
      await this.audit.log({
        actorId,
        action: "CREATE_USER",
        objectType: "User",
        objectId: user.id,
        newValue: { nama, email, subRoles: [tipe], sumber: "mata kuliah" },
      });
    }
    return user;
  }

  // ------------------------------------------------------------ helper

  private async requireCourse(id: string) {
    const course = await this.prisma.mataKuliah.findFirst({ where: { id, deletedAt: null } });
    if (!course) throw new NotFoundException("Mata kuliah tidak ditemukan");
    return course;
  }

  private async attachAsisten(courses: any[]) {
    const ids = Array.from(new Set(courses.flatMap((c) => c.asistenIds || [])));
    const users = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nama: true, email: true } })
      : [];
    const map = Object.fromEntries(users.map((u) => [u.id, u]));
    return courses.map((course) => {
      const { schedules, ...rest } = course;
      return {
        ...rest,
        asisten: (course.asistenIds || []).map((id: string) => map[id]).filter(Boolean),
        kelas: schedules,
      };
    });
  }

  private cleanIds(input: any): string[] {
    if (!Array.isArray(input)) return [];
    return Array.from(new Set(input.map((x: any) => String(x)).filter(Boolean)));
  }

  private intInRange(value: any, fallback: number, min: number, max: number, label: string): number {
    if (value === undefined || value === null || value === "") return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new BadRequestException(`${label} harus berupa angka ${min} sampai ${max}`);
    }
    return n;
  }

  private async validatePersonel(params: { dosenId?: string | null; instrukturId?: string | null; asistenIds?: string[] }) {
    const checks: { label: string; id?: string | null }[] = [
      { label: "Dosen pengampu", id: params.dosenId },
      { label: "Instruktur", id: params.instrukturId },
      ...(params.asistenIds || []).map((id) => ({ label: "Asisten dosen", id })),
    ];
    for (const { label, id } of checks) {
      if (!id) continue;
      const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!user) throw new BadRequestException(`${label} tidak ditemukan atau sudah nonaktif`);
    }
  }

  private async normalizeKelas(rows: KelasInput[]): Promise<NormalizedKelas[]> {
    const out: NormalizedKelas[] = [];
    const names = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const line = i + 1;
      const nama = String(row.nama || "").trim();
      if (!nama) throw new BadRequestException(`Nama kelas pada baris ${line} wajib diisi`);
      if (names.has(nama.toLowerCase())) throw new BadRequestException(`Kelas ${nama} dicantumkan lebih dari sekali`);
      names.add(nama.toLowerCase());

      const labId = String(row.labId || "").trim();
      if (!labId) throw new BadRequestException(`Lab untuk kelas ${nama} wajib dipilih`);
      const lab = await this.prisma.lab.findFirst({ where: { id: labId, deletedAt: null }, select: { id: true } });
      if (!lab) throw new BadRequestException(`Lab untuk kelas ${nama} tidak ditemukan`);

      const hari = Number(row.hari);
      if (!Number.isInteger(hari) || hari < 0 || hari > 6) {
        throw new BadRequestException(`Hari kelas ${nama} tidak valid`);
      }
      const jamMulai = String(row.jamMulai || "").trim();
      const jamSelesai = String(row.jamSelesai || "").trim();
      if (!/^\d{1,2}:\d{2}$/.test(jamMulai) || !/^\d{1,2}:\d{2}$/.test(jamSelesai)) {
        throw new BadRequestException(`Jam kelas ${nama} tidak valid`);
      }
      if (timeToMin(jamMulai) >= timeToMin(jamSelesai)) {
        throw new BadRequestException(`Jam mulai kelas ${nama} harus sebelum jam selesai`);
      }

      const tanggalMulai = startOfJakartaDay(String(row.tanggalMulai || ""));
      const tanggalSelesai = startOfJakartaDay(String(row.tanggalSelesai || ""));
      if (Number.isNaN(tanggalMulai.getTime()) || Number.isNaN(tanggalSelesai.getTime())) {
        throw new BadRequestException(`Tanggal kelas ${nama} tidak valid`);
      }
      if (tanggalMulai > tanggalSelesai) {
        throw new BadRequestException(`Tanggal mulai kelas ${nama} harus sebelum tanggal selesai`);
      }

      const semester = String(row.semester || "").trim();
      if (!semester) throw new BadRequestException(`Semester akademik kelas ${nama} wajib diisi`);

      out.push({ nama, labId, hari, jamMulai, jamSelesai, tanggalMulai, tanggalSelesai, semester });
    }

    // Kelas dalam satu permintaan juga tidak boleh saling bentrok.
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (
          a.labId === b.labId &&
          a.hari === b.hari &&
          daysOverlap(a.tanggalMulai, a.tanggalSelesai, b.tanggalMulai, b.tanggalSelesai) &&
          timeOverlap(a.jamMulai, a.jamSelesai, b.jamMulai, b.jamSelesai)
        ) {
          throw new BadRequestException(`Kelas ${a.nama} dan ${b.nama} memakai lab dan jam yang sama`);
        }
      }
    }
    return out;
  }

  private async assertKelasNameFree(courseId: string, nama: string, excludeId?: string) {
    const duplicate = await this.prisma.schedule.findFirst({
      where: {
        mataKuliahId: courseId,
        kelas: nama,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException(`Kelas ${nama} sudah ada pada mata kuliah ini`);
  }

  private async assertNoConflict(kelas: NormalizedKelas, excludeId?: string) {
    const conflict = await findScheduleConflict(this.prisma, { ...kelas, excludeId });
    if (conflict.conflict) {
      const lawan = conflict.type === "jadwal" ? "jadwal praktikum" : "peminjaman";
      throw new BadRequestException(
        `Kelas ${kelas.nama} bentrok dengan ${lawan} lain pada lab, hari, dan jam yang sama`,
      );
    }
  }

  private toSchedule(
    course: { id: string; nama: string; dosenId: string | null; instrukturId: string | null; asistenIds: string[] },
    kelas: NormalizedKelas,
  ) {
    return {
      labId: kelas.labId,
      mataKuliahId: course.id,
      mataKuliah: course.nama,
      kelas: kelas.nama,
      // Instruktur adalah pengampu sesi praktikum; dosen menjadi cadangan.
      pengampuId: course.instrukturId ?? course.dosenId,
      asistenIds: course.asistenIds || [],
      hari: kelas.hari,
      jamMulai: kelas.jamMulai,
      jamSelesai: kelas.jamSelesai,
      tanggalMulai: kelas.tanggalMulai,
      tanggalSelesai: kelas.tanggalSelesai,
      semester: kelas.semester,
      jenis: "PRAKTIKUM_RUTIN" as const,
      status: "AKTIF" as const,
    };
  }
}
