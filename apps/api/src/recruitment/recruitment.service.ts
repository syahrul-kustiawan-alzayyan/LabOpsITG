import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

function positionLabel(tipe: string) {
  return tipe === "INSTRUKTUR" ? "Instruktur" : "Asisten Dosen";
}

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  // Periods
  findPeriods(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.recruitmentPeriod.findMany({ where, orderBy: { createdAt: "desc" }, include: { _count: { select: { applications: true } } } });
  }

  /** Periode yang masih dibuka dan belum lewat tenggat, untuk halaman informasi publik. */
  findOpenPeriods() {
    const now = new Date();
    return this.prisma.recruitmentPeriod.findMany({
      where: { status: "DIBUKA", tenggat: { gte: now } },
      orderBy: { tenggat: "asc" },
      select: {
        id: true,
        posisi: true,
        tipe: true,
        mataKuliah: true,
        kuota: true,
        persyaratan: true,
        tenggat: true,
        _count: { select: { applications: true } },
      },
    });
  }

  findPeriod(id: string) {
    return this.prisma.recruitmentPeriod.findUnique({ where: { id }, include: { applications: { include: { pelamar: { select: { nama: true, email: true } } } } } });
  }

  async createPeriod(data: any, actorId: string) {
    const tipe = data.tipe === "INSTRUKTUR" ? "INSTRUKTUR" : "ASISTEN_DOSEN";
    const period = await this.prisma.recruitmentPeriod.create({
      data: {
        posisi: positionLabel(tipe),
        tipe,
        mataKuliah: data.mataKuliah,
        kuota: Number(data.kuota),
        persyaratan: data.persyaratan,
        tenggat: new Date(data.tenggat),
        status: "DIBUKA",
      },
    });
    await this.audit.log({ actorId, action: "CREATE_RECRUITMENT_PERIOD", objectType: "RecruitmentPeriod", objectId: period.id, newValue: period });
    return period;
  }

  async updatePeriod(id: string, data: any, actorId: string) {
    const before = await this.prisma.recruitmentPeriod.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Periode tidak ditemukan");
    const tipe = data.tipe ? (data.tipe === "INSTRUKTUR" ? "INSTRUKTUR" : "ASISTEN_DOSEN") : undefined;
    const period = await this.prisma.recruitmentPeriod.update({
      where: { id },
      data: {
        posisi: tipe ? positionLabel(tipe) : undefined,
        tipe,
        mataKuliah: data.mataKuliah,
        kuota: data.kuota ? Number(data.kuota) : undefined,
        persyaratan: data.persyaratan,
        tenggat: data.tenggat ? new Date(data.tenggat) : undefined,
        status: data.status,
      },
    });
    await this.audit.log({ actorId, action: "UPDATE_RECRUITMENT_PERIOD", objectType: "RecruitmentPeriod", objectId: id, oldValue: before, newValue: period });
    return period;
  }

  async closePeriod(id: string, actorId: string) {
    return this.updatePeriod(id, { status: "DITUTUP" }, actorId);
  }

  // Applications
  async apply(data: any, pelamarId: string) {
    const period = await this.prisma.recruitmentPeriod.findUnique({ where: { id: data.periodId } });
    if (!period) throw new NotFoundException("Periode tidak ditemukan");
    if (period.status !== "DIBUKA") throw new BadRequestException("Periode rekrutmen sudah ditutup");
    if (new Date() > period.tenggat) throw new BadRequestException("Tenggat lamaran sudah lewat");
    const existing = await this.prisma.application.findFirst({ where: { periodId: data.periodId, pelamarId } });
    if (existing) throw new BadRequestException("Anda sudah melamar pada periode ini");
    const app = await this.prisma.application.create({
      data: {
        periodId: data.periodId,
        pelamarId,
        mataKuliahDilamar: data.mataKuliahDilamar,
        motivasi: data.motivasi,
        nilai: data.nilai ? Number(data.nilai) : null,
        ketersediaan: data.ketersediaan,
        cvUrl: data.cvUrl,
        transkripUrl: data.transkripUrl,
        status: "DIAJUKAN",
      },
    });
    await this.audit.log({ actorId: pelamarId, action: "APPLY_RECRUITMENT", objectType: "Application", objectId: app.id, newValue: app });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "LAMARAN_BARU", `Lamaran baru untuk ${period.posisi}`);
    return app;
  }

  findApplications(q: { periodId?: string; status?: string }) {
    const where: any = { deletedAt: null };
    if (q.periodId) where.periodId = q.periodId;
    if (q.status) where.status = q.status;
    return this.prisma.application.findMany({
      where,
      include: { pelamar: { select: { nama: true, email: true } }, period: { select: { posisi: true, mataKuliah: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Lamaran dari halaman informasi publik (tanpa akun kampus).
   * Semua berkas wajib diunggah dan pernyataan kebenaran data wajib dicentang.
   */
  async applyPublic(data: any) {
    const period = await this.prisma.recruitmentPeriod.findUnique({ where: { id: data.periodId } });
    if (!period) throw new NotFoundException("Periode rekrutmen tidak ditemukan");
    if (period.status !== "DIBUKA") throw new BadRequestException("Periode rekrutmen sudah ditutup");
    if (new Date() > period.tenggat) throw new BadRequestException("Tenggat lamaran sudah lewat");

    const tipe = period.tipe;
    const namaLengkap = String(data.namaLengkap || "").trim();
    const email = String(data.emailKontak || "").trim().toLowerCase();
    const noWhatsapp = String(data.noWhatsapp || "").replace(/[^\d+]/g, "");
    const mataKuliahDilamar = period.mataKuliah;
    const nim = data.nim ? String(data.nim).trim() : "";
    const gelar = data.gelar ? String(data.gelar).trim() : "";

    if (!namaLengkap) throw new BadRequestException("Nama lengkap wajib diisi");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Format email tidak valid");
    if (!/^\+?\d{9,15}$/.test(noWhatsapp)) throw new BadRequestException("Nomor WhatsApp tidak valid");
    if (!mataKuliahDilamar) throw new BadRequestException("Mata kuliah praktikum wajib diisi");
    if (tipe === "ASISTEN_DOSEN" && !nim) throw new BadRequestException("NIM wajib diisi untuk asisten dosen");
    if (tipe === "INSTRUKTUR" && !gelar) throw new BadRequestException("Gelar wajib diisi untuk instruktur");

    const suratLamaranUrl = String(data.suratLamaranUrl || "").trim();
    const cvUrl = String(data.cvUrl || "").trim();
    const transkripUrl = String(data.transkripUrl || "").trim();
    if (!suratLamaranUrl || !cvUrl || !transkripUrl) {
      throw new BadRequestException("Surat lamaran, CV, dan transkrip nilai wajib diunggah");
    }
    if (data.pernyataan !== true) {
      throw new BadRequestException("Anda harus menyetujui pernyataan kebenaran data");
    }

    const existing = await this.prisma.application.findFirst({
      where: { periodId: data.periodId, emailKontak: email, deletedAt: null },
    });
    if (existing) throw new BadRequestException("Email ini sudah melamar pada periode tersebut");

    const app = await this.prisma.application.create({
      data: {
        periodId: data.periodId,
        pelamarId: null,
        tipe,
        namaLengkap,
        emailKontak: email,
        nim: nim || null,
        gelar: gelar || null,
        noWhatsapp,
        mataKuliahDilamar,
        motivasi: data.motivasi ? String(data.motivasi) : null,
        suratLamaranUrl,
        cvUrl,
        transkripUrl,
        pernyataan: true,
        status: "DIAJUKAN",
      },
    });

    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "LAMARAN_BARU", `Lamaran publik baru untuk ${period.posisi} — ${namaLengkap}`);
    return { id: app.id, status: app.status, message: "Lamaran berhasil dikirim" };
  }

  findMyApplications(userId: string) {
    return this.prisma.application.findMany({ where: { pelamarId: userId, deletedAt: null }, include: { period: { select: { posisi: true, mataKuliah: true, tenggat: true, status: true } } }, orderBy: { createdAt: "desc" } });
  }

  async updateStatus(id: string, status: string, catatan: string | undefined, actorId: string) {
    const app = await this.prisma.application.findUnique({ where: { id }, include: { period: true } });
    if (!app) throw new NotFoundException("Lamaran tidak ditemukan");
    const updated = await this.prisma.application.update({ where: { id }, data: { status: status as any, catatanPenilaian: catatan } });
    await this.audit.log({ actorId, action: "UPDATE_APPLICATION_STATUS", objectType: "Application", objectId: id, oldValue: { status: app.status }, newValue: { status } });
    if (app.pelamarId) {
      await this.notif.create(app.pelamarId, "LAMARAN_STATUS", `Lamaran Anda berstatus ${status}`);
    }
    // auto-role if accepted (hanya untuk pelamar yang punya akun)
    if (status === "DITERIMA" && app.pelamarId) {
      const tipe = app.tipe ?? app.period.tipe;
      const subRole = tipe === "INSTRUKTUR" ? "INSTRUKTUR" : "ASISTEN_DOSEN";
      const user = await this.prisma.user.findUnique({ where: { id: app.pelamarId } });
      if (user && !user.subRoles.includes(subRole as any)) {
        await this.prisma.user.update({ where: { id: app.pelamarId }, data: { subRoles: { push: subRole as any } } });
      }
      // link user ke mata kuliah sesuai tipe rekrutmen
      const courseName = app.period?.mataKuliah || app.mataKuliahDilamar;
      if (courseName) {
        const course = await this.prisma.mataKuliah.findFirst({
          where: { nama: courseName, deletedAt: null },
        });
        if (course) {
          if (tipe === "INSTRUKTUR") {
            await this.prisma.mataKuliah.update({
              where: { id: course.id },
              data: { instrukturId: app.pelamarId },
            });
          } else if (tipe === "ASISTEN_DOSEN") {
            await this.prisma.mataKuliah.update({
              where: { id: course.id },
              data: { asistenIds: { push: app.pelamarId } },
            });
          }
          // sinkronkan ke schedule aktif milik course tersebut
          const schedules = await this.prisma.schedule.findMany({
            where: { mataKuliahId: course.id, deletedAt: null, status: "AKTIF" },
          });
          if (tipe === "INSTRUKTUR") {
            for (const s of schedules) {
              if (!s.pengampuId) {
                await this.prisma.schedule.update({
                  where: { id: s.id },
                  data: { pengampuId: app.pelamarId },
                });
              }
            }
          } else if (tipe === "ASISTEN_DOSEN") {
            for (const s of schedules) {
              const existing = s.asistenIds || [];
              if (!existing.includes(app.pelamarId)) {
                await this.prisma.schedule.update({
                  where: { id: s.id },
                  data: { asistenIds: { push: app.pelamarId } },
                });
              }
            }
          }
        }
      }
    }
    return updated;
  }

  async setInterview(id: string, tanggal: string, actorId: string) {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException("Lamaran tidak ditemukan");
    // store interview date in catatanPenilaian (simple) or a field; Application has no interview date field. We'll append to catatan.
    const note = `Wawancara: ${tanggal}`;
    const updated = await this.prisma.application.update({ where: { id }, data: { status: "WAWANCARA", catatanPenilaian: note } });
    await this.notif.create(app.pelamarId, "WAWANCARA_DIJADWALKAN", `Wawancara dijadwalkan: ${tanggal}`);
    return updated;
  }

  exportCsv(periodId?: string) {
    return this.findApplications(periodId ? { periodId } : {});
  }
}
