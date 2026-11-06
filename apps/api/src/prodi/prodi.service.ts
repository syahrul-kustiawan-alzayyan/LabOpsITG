import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

type Actor = { id: string; role: string; prodiId?: string };

@Injectable()
export class ProdiService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(actor?: Actor) {
    const where: any = { deletedAt: null };
    // Kaprodi hanya melihat prodi miliknya
    if (actor?.role === "KAPRODI" && actor?.prodiId) {
      where.id = actor.prodiId;
    }
    return this.prisma.prodi.findMany({
      where,
      include: {
        kaproci: { select: { id: true, nama: true, email: true } },
        _count: { select: { users: true, mataKuliah: true } },
      },
      orderBy: { nama: "asc" },
    });
  }

  async findOne(id: string, actor?: Actor) {
    const prodi = await this.prisma.prodi.findUnique({
      where: { id, deletedAt: null },
      include: {
        kaproci: { select: { id: true, nama: true, email: true } },
        users: { select: { id: true, nama: true, email: true, role: true, subRoles: true } },
        mataKuliah: { select: { id: true, kode: true, nama: true, status: true } },
      },
    });
    if (!prodi) throw new NotFoundException("Prodi tidak ditemukan");
    // Kaprodi hanya boleh melihat prodi miliknya
    if (actor?.role === "KAPRODI" && actor?.prodiId !== id) {
      throw new ForbiddenException("Anda hanya dapat mengakses prodi milik Anda");
    }
    return prodi;
  }

  async create(data: { kode: string; nama: string; status?: any }, actor?: Actor) {
    const exists = await this.prisma.prodi.findUnique({ where: { kode: data.kode } });
    if (exists) throw new BadRequestException("Kode prodi sudah ada");
    const prodi = await this.prisma.prodi.create({
      data: { kode: data.kode, nama: data.nama, status: data.status || "AKTIF" },
      select: { id: true, kode: true, nama: true, status: true, createdAt: true },
    });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "CREATE_PRODI", objectType: "Prodi", objectId: prodi.id, newValue: prodi });
    return prodi;
  }

  async update(id: string, data: { nama?: string; status?: any }, actor?: Actor) {
    const before = await this.prisma.prodi.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Prodi tidak ditemukan");
    if (actor?.role === "KAPRODI" && before.id !== actor?.prodiId) {
      throw new ForbiddenException("Anda hanya dapat mengubah prodi milik Anda");
    }
    const prodi = await this.prisma.prodi.update({
      where: { id },
      data: { nama: data.nama, status: data.status },
      select: { id: true, kode: true, nama: true, status: true },
    });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "UPDATE_PRODI", objectType: "Prodi", objectId: id, oldValue: before, newValue: prodi });
    return prodi;
  }

  async remove(id: string, actor?: Actor) {
    const before = await this.prisma.prodi.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Prodi tidak ditemukan");
    if (actor?.role === "KAPRODI" && before.id !== actor?.prodiId) {
      throw new ForbiddenException("Anda hanya dapat menghapus prodi milik Anda");
    }
    await this.prisma.prodi.update({ where: { id }, data: { deletedAt: new Date(), status: "NONAKTIF" } });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "DELETE_PRODI", objectType: "Prodi", objectId: id, oldValue: before });
    return { ok: true };
  }

  async setKaprodi(prodiId: string, kaprodiId: string, actor?: Actor) {
    const prodi = await this.prisma.prodi.findUnique({ where: { id: prodiId } });
    if (!prodi) throw new NotFoundException("Prodi tidak ditemukan");
    if (actor?.role === "KAPRODI" && prodiId !== actor?.prodiId) {
      throw new ForbiddenException("Anda hanya dapat mengatur kaprodi prodi milik Anda");
    }
    const user = await this.prisma.user.findUnique({ where: { id: kaprodiId } });
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan");
    if (user.role !== "KAPRODI") throw new BadRequestException("Hanya pengguna dengan role KAPRODI yang dapat ditetapkan sebagai kaprodi");
    const updated = await this.prisma.prodi.update({
      where: { id: prodiId },
      data: { kaprodiId },
      include: { kaproci: { select: { id: true, nama: true, email: true } } },
    });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "SET_KAPRODI", objectType: "Prodi", objectId: prodiId, newValue: { kaprodiId } });
    return updated;
  }
}
