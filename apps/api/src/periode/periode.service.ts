import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

type Actor = { id: string; role: string };

@Injectable()
export class PeriodeService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(actor?: Actor) {
    return this.prisma.periode.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { schedules: true, mataKuliah: true, attendance: true } },
      },
      orderBy: [{ status: "desc" }, { nama: "asc" }],
    });
  }

  async findOne(id: string) {
    const periode = await this.prisma.periode.findUnique({
      where: { id, deletedAt: null },
      include: {
        schedules: { select: { id: true, mataKuliah: true, kelas: true, status: true } },
        mataKuliah: { select: { id: true, kode: true, nama: true, status: true } },
      },
    });
    if (!periode) throw new NotFoundException("Periode tidak ditemukan");
    return periode;
  }

  async create(data: { nama: string; kode: string; tanggalMulai: string; tanggalSelesai: string; status?: any; isCurrent?: boolean }, actor?: Actor) {
    const exists = await this.prisma.periode.findUnique({ where: { kode: data.kode } });
    if (exists) throw new BadRequestException("Kode periode sudah ada");

    const mulai = new Date(data.tanggalMulai);
    const selesai = new Date(data.tanggalSelesai);
    if (isNaN(mulai.getTime()) || isNaN(selesai.getTime())) throw new BadRequestException("Tanggal periode tidak valid");
    if (selesai <= mulai) throw new BadRequestException("Tanggal selesai harus setelah tanggal mulai");

    // Jika ditandai sebagai current, nonaktifkan current yang lama
    if (data.isCurrent) {
      await this.prisma.periode.updateMany({ where: { isCurrent: true, deletedAt: null }, data: { isCurrent: false } });
    }

    const periode = await this.prisma.periode.create({
      data: {
        nama: data.nama,
        kode: data.kode,
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        status: data.status || "AKTIF",
        isCurrent: data.isCurrent || false,
      },
      select: { id: true, nama: true, kode: true, tanggalMulai: true, tanggalSelesai: true, status: true, isCurrent: true },
    });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "CREATE_PERIODE", objectType: "Periode", objectId: periode.id, newValue: periode });
    return periode;
  }

  async update(id: string, data: { nama?: string; tanggalMulai?: string; tanggalSelesai?: string; status?: any; isCurrent?: boolean }, actor?: Actor) {
    const before = await this.prisma.periode.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Periode tidak ditemukan");

    const updateData: any = {};
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.tanggalMulai !== undefined) {
      const t = new Date(data.tanggalMulai);
      if (isNaN(t.getTime())) throw new BadRequestException("Tanggal mulai tidak valid");
      updateData.tanggalMulai = t;
    }
    if (data.tanggalSelesai !== undefined) {
      const t = new Date(data.tanggalSelesai);
      if (isNaN(t.getTime())) throw new BadRequestException("Tanggal selesai tidak valid");
      updateData.tanggalSelesai = t;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isCurrent !== undefined && data.isCurrent) {
      await this.prisma.periode.updateMany({ where: { isCurrent: true, deletedAt: null, id: { not: id } }, data: { isCurrent: false } });
      updateData.isCurrent = true;
    }

    const periode = await this.prisma.periode.update({ where: { id }, data: updateData });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "UPDATE_PERIODE", objectType: "Periode", objectId: id, oldValue: before, newValue: periode });
    return periode;
  }

  async remove(id: string, actor?: Actor) {
    const before = await this.prisma.periode.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Periode tidak ditemukan");
    // Cek apakah masih terpakai
    const [schedules, courses, attendance] = await Promise.all([
      this.prisma.schedule.count({ where: { periodeId: id, deletedAt: null } }),
      this.prisma.mataKuliah.count({ where: { periodeId: id, deletedAt: null } }),
      this.prisma.attendance.count({ where: { periodeId: id, deletedAt: null } }),
    ]);
    if (schedules > 0 || courses > 0 || attendance > 0) {
      throw new BadRequestException("Periode masih memiliki data terkait, tidak dapat dihapus");
    }
    await this.prisma.periode.update({ where: { id }, data: { deletedAt: new Date(), status: "NONAKTIF" } });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "DELETE_PERIODE", objectType: "Periode", objectId: id, oldValue: before });
    return { ok: true };
  }

  async setCurrent(id: string, actor?: Actor) {
    const periode = await this.prisma.periode.findUnique({ where: { id, deletedAt: null } });
    if (!periode) throw new NotFoundException("Periode tidak ditemukan");
    await this.prisma.periode.updateMany({ where: { isCurrent: true, deletedAt: null }, data: { isCurrent: false } });
    const updated = await this.prisma.periode.update({ where: { id }, data: { isCurrent: true, status: "AKTIF" } });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "SET_CURRENT_PERIODE", objectType: "Periode", objectId: id, newValue: { isCurrent: true } });
    return updated;
  }
}
