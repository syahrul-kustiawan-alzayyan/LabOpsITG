import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class LabsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  findAll() { return this.prisma.lab.findMany({ where: { deletedAt: null }, orderBy: { kode: "asc" } }); }

  findOne(id: string) { return this.prisma.lab.findUnique({ where: { id } }); }

  async create(data: { kode: string; nama: string; kapasitas: number; lokasi: string }, actorId?: string) {
    const exists = await this.prisma.lab.findUnique({ where: { kode: data.kode } });
    if (exists) throw new BadRequestException("Kode lab sudah ada");
    const lab = await this.prisma.lab.create({ data: { ...data, qrToken: `qr-${data.kode.toLowerCase()}-${Date.now()}` } });
    if (actorId) await this.audit.log({ actorId, action: "CREATE_LAB", objectType: "Lab", objectId: lab.id, newValue: lab });
    return lab;
  }

  async update(id: string, data: { nama?: string; kapasitas?: number; lokasi?: string; status?: any }, actorId?: string) {
    const before = await this.prisma.lab.findUnique({ where: { id } });
    const lab = await this.prisma.lab.update({ where: { id }, data });
    if (actorId) await this.audit.log({ actorId, action: "UPDATE_LAB", objectType: "Lab", objectId: id, oldValue: before, newValue: lab });
    return lab;
  }

  async regenerateQr(id: string, actorId?: string) {
    const lab = await this.prisma.lab.update({ where: { id }, data: { qrVersion: { increment: 1 }, qrToken: `qr-${id}-${Date.now()}` } });
    if (actorId) await this.audit.log({ actorId, action: "REGENERATE_QR", objectType: "Lab", objectId: id, newValue: { qrVersion: lab.qrVersion } });
    return lab;
  }

  async remove(id: string, actorId?: string) {
    const before = await this.prisma.lab.findUnique({ where: { id } });
    const lab = await this.prisma.lab.update({ where: { id }, data: { deletedAt: new Date(), status: "NONAKTIF" } });
    if (actorId) await this.audit.log({ actorId, action: "DELETE_LAB", objectType: "Lab", objectId: id, oldValue: before });
    return { ok: true };
  }
}
