import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  findAll(q: { labId?: string; kondisi?: string; kategori?: string }) {
    const where: any = { deletedAt: null };
    if (q.labId) where.labId = q.labId;
    if (q.kondisi) where.kondisi = q.kondisi;
    if (q.kategori) where.kategori = q.kategori;
    return this.prisma.inventoryItem.findMany({ where, include: { lab: { select: { kode: true, nama: true } } }, orderBy: { kodeAset: "asc" } });
  }

  findOne(id: string) {
    return this.prisma.inventoryItem.findUnique({ where: { id }, include: { lab: true, issues: true, mutations: true } });
  }

  async create(data: any, actorId?: string) {
    const exists = await this.prisma.inventoryItem.findUnique({ where: { kodeAset: data.kodeAset } });
    if (exists) throw new BadRequestException("Kode aset sudah ada");
    const item = await this.prisma.inventoryItem.create({
      data: { kodeAset: data.kodeAset, nama: data.nama, kategori: data.kategori, labId: data.labId, kondisi: data.kondisi || "BAIK", tanggalPerolehan: data.tanggalPerolehan ? new Date(data.tanggalPerolehan) : null, catatan: data.catatan },
    });
    if (actorId) await this.audit.log({ actorId, action: "CREATE_INVENTORY", objectType: "InventoryItem", objectId: item.id, newValue: item });
    return item;
  }

  async update(id: string, data: any, actorId?: string) {
    const before = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Item tidak ditemukan");
    const item = await this.prisma.inventoryItem.update({ where: { id }, data: { nama: data.nama, kategori: data.kategori, labId: data.labId, kondisi: data.kondisi, tanggalPerolehan: data.tanggalPerolehan ? new Date(data.tanggalPerolehan) : undefined, catatan: data.catatan } });
    if (actorId) await this.audit.log({ actorId, action: "UPDATE_INVENTORY", objectType: "InventoryItem", objectId: id, oldValue: before, newValue: item });
    return item;
  }

  async mutate(id: string, labTujuanId: string, actorId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Item tidak ditemukan");
    if (item.labId === labTujuanId) throw new BadRequestException("Lab tujuan sama dengan lab asal");
    const mut = await this.prisma.inventoryMutation.create({ data: { itemId: id, labAsalId: item.labId, labTujuanId, actorId } });
    await this.prisma.inventoryItem.update({ where: { id }, data: { labId: labTujuanId } });
    await this.audit.log({ actorId, action: "MUTATE_INVENTORY", objectType: "InventoryItem", objectId: id, oldValue: { labId: item.labId }, newValue: { labId: labTujuanId } });
    return mut;
  }

  async remove(id: string, actorId?: string) {
    const before = await this.prisma.inventoryItem.findUnique({ where: { id } });
    await this.prisma.inventoryItem.update({ where: { id }, data: { deletedAt: new Date(), kondisi: "DIHAPUSKAN" } });
    if (actorId) await this.audit.log({ actorId, action: "DELETE_INVENTORY", objectType: "InventoryItem", objectId: id, oldValue: before });
    return { ok: true };
  }

  async importCsv(rows: { kodeAset: string; nama: string; kategori: string; labKode: string; kondisi?: string; tanggalPerolehan?: string; catatan?: string }[], actorId?: string) {
    const results: { row: number; status: "ok" | "error"; message?: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const lab = await this.prisma.lab.findUnique({ where: { kode: r.labKode } });
        if (!lab) throw new BadRequestException("Lab tidak ditemukan");
        await this.create({ kodeAset: r.kodeAset, nama: r.nama, kategori: r.kategori, labId: lab.id, kondisi: r.kondisi, tanggalPerolehan: r.tanggalPerolehan, catatan: r.catatan }, actorId);
        results.push({ row: i + 1, status: "ok" });
      } catch (e: any) {
        results.push({ row: i + 1, status: "error", message: e?.message || "Gagal" });
      }
    }
    return results;
  }

  summary() {
    return this.prisma.inventoryItem.groupBy({ by: ["labId", "kondisi"], where: { deletedAt: null }, _count: { _all: true } });
  }
}
