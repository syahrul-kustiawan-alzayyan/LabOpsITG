import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class IssuesService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  async genTicket(): Promise<string> {
    const count = await this.prisma.issue.count();
    return `KDL-${String(count + 1).padStart(4, "0")}`;
  }

  findAll(q: { status?: string; labId?: string; urgensi?: string; pelaporId?: string }) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.labId) where.labId = q.labId;
    if (q.urgensi) where.urgensi = q.urgensi;
    if (q.pelaporId) where.pelaporId = q.pelaporId;
    return this.prisma.issue.findMany({
      where,
      include: { lab: { select: { kode: true, nama: true } }, pelapor: { select: { nama: true, email: true } }, penanggungJawab: { select: { nama: true } }, item: { select: { kodeAset: true, nama: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findOne(id: string) {
    return this.prisma.issue.findUnique({ where: { id }, include: { lab: true, pelapor: { select: { nama: true, email: true } }, penanggungJawab: { select: { nama: true, email: true } }, item: true, history: { orderBy: { createdAt: "asc" }, include: { /* actor via join not available */ } } } });
  }

  async create(data: any, actorId: string) {
    const nomorTiket = await this.genTicket();
    const issue = await this.prisma.issue.create({
      data: {
        nomorTiket,
        pelaporId: actorId,
        labId: data.labId,
        itemId: data.itemId || null,
        kategori: data.kategori,
        urgensi: data.urgensi || "SEDANG",
        deskripsi: data.deskripsi,
        fotoUrls: data.fotoUrls || [],
        status: "BARU",
      },
    });
    // auto-update item condition to RUSAK
    if (data.itemId) {
      await this.prisma.inventoryItem.update({ where: { id: data.itemId }, data: { kondisi: "RUSAK" } });
    }
    // history
    await this.prisma.issueHistory.create({ data: { issueId: issue.id, status: "BARU", catatan: "Tiket dibuat", actorId } });
    await this.audit.log({ actorId, action: "CREATE_ISSUE", objectType: "Issue", objectId: issue.id, newValue: issue });
    // notify coordinators
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KENDALA_BARU", `Kendala baru: ${issue.nomorTiket} (${issue.kategori})`);
    return issue;
  }

  async verify(id: string, penanggungJawabId: string, catatan: string | undefined, actorId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException("Tiket tidak ditemukan");
    if (issue.status !== "BARU") throw new BadRequestException("Hanya tiket berstatus Baru yang dapat diverifikasi");
    const updated = await this.prisma.issue.update({ where: { id }, data: { status: "DIVERIFIKASI", penanggungJawabId } });
    await this.prisma.issueHistory.create({ data: { issueId: id, status: "DIVERIFIKASI", catatan: catatan || "Diverifikasi", actorId } });
    await this.audit.log({ actorId, action: "VERIFY_ISSUE", objectType: "Issue", objectId: id, oldValue: issue, newValue: updated });
    if (penanggungJawabId) await this.notif.create(penanggungJawabId, "KENDALA_DITUGASKAN", `Anda ditugaskan menangani ${issue.nomorTiket}`);
    await this.notif.create(issue.pelaporId, "KENDALA_DIVERIFIKASI", `Kendala ${issue.nomorTiket} telah diverifikasi`);
    return updated;
  }

  async updateStatus(id: string, status: string, catatan: string | undefined, actorId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException("Tiket tidak ditemukan");
    const allowed: Record<string, string[]> = {
      DIVERIFIKASI: ["DALAM_PENANGANAN"],
      DALAM_PENANGANAN: ["SELESAI"],
      SELESAI: [],
      BARU: ["DIVERIFIKASI"],
    };
    if (!allowed[issue.status]?.includes(status)) throw new BadRequestException(`Transisi status dari ${issue.status} ke ${status} tidak diizinkan`);
    const updated = await this.prisma.issue.update({ where: { id }, data: { status: status as any } });
    await this.prisma.issueHistory.create({ data: { issueId: id, status: status as any, catatan: catatan || "", actorId } });
    await this.audit.log({ actorId, action: "UPDATE_ISSUE_STATUS", objectType: "Issue", objectId: id, oldValue: { status: issue.status }, newValue: { status } });
    await this.notif.create(issue.pelaporId, "KENDALA_STATUS", `Kendala ${issue.nomorTiket} berstatus ${status}`);
    return updated;
  }

  async reopen(id: string, catatan: string | undefined, actorId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException("Tiket tidak ditemukan");
    if (issue.status !== "SELESAI") throw new BadRequestException("Hanya tiket selesai yang dapat dibuka kembali");
    const updated = await this.prisma.issue.update({ where: { id }, data: { status: "DIVERIFIKASI" } });
    await this.prisma.issueHistory.create({ data: { issueId: id, status: "DIVERIFIKASI", catatan: catatan || "Dibuka kembali oleh pelapor", actorId } });
    await this.audit.log({ actorId, action: "REOPEN_ISSUE", objectType: "Issue", objectId: id });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KENDALA_REOPEN", `Kendala ${issue.nomorTiket} dibuka kembali`);
    return updated;
  }
}
