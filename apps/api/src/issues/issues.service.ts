import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { addDays, todayJakarta } from "../common/time";

const MAX_LIMIT = 500;
const SLA_DAYS: Record<string, number> = { TINGGI: 1, SEDANG: 3, RENDAH: 7 };

@Injectable()
export class IssuesService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  async genTicket(): Promise<string> {
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    for (let i = 0; i < 5; i++) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const nomorTiket = `KDL-${stamp}-${suffix}`;
      const exists = await this.prisma.issue.findUnique({ where: { nomorTiket } });
      if (!exists) return nomorTiket;
    }
    throw new BadRequestException("Gagal membuat nomor tiket, coba lagi");
  }

  async findAll(q: { status?: string; labId?: string; urgensi?: string; pelaporId?: string; page?: string; limit?: string }, actor?: { sub: string; role: string }) {
    const where: any = { deletedAt: null };
    if (actor?.role === "USER" && actor.sub) where.pelaporId = actor.sub;
    else if (q.pelaporId) where.pelaporId = q.pelaporId;
    if (q.status) where.status = q.status;
    if (q.labId) where.labId = q.labId;
    if (q.urgensi) where.urgensi = q.urgensi;
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 200));
    return this.prisma.issue.findMany({
      where,
      include: {
        lab: { select: { kode: true, nama: true } },
        pelapor: { select: { nama: true, email: true } },
        penanggungJawab: { select: { nama: true } },
        item: { select: { kodeAset: true, nama: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string, actor?: { sub: string; role: string }) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        lab: true,
        pelapor: { select: { id: true, nama: true, email: true } },
        penanggungJawab: { select: { nama: true, email: true } },
        item: true,
        history: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!issue || issue.deletedAt) throw new NotFoundException("Tiket tidak ditemukan");
    if (actor && actor.role === "USER" && issue.pelaporId !== actor.sub) {
      throw new ForbiddenException("Tidak berhak melihat tiket ini");
    }
    const actorIds = Array.from(new Set(issue.history.map((h) => h.actorId)));
    const actors = actorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, nama: true } })
      : [];
    const map = Object.fromEntries(actors.map((a) => [a.id, a.nama]));
    return { ...issue, history: issue.history.map((h) => ({ ...h, actorNama: map[h.actorId] || (h.actorId === "publik" ? "Pelapor (publik)" : "Sistem") })) };
  }

  async create(data: any, actorId: string) {
    const nomorTiket = await this.genTicket();
    const urgensi = ["RENDAH", "SEDANG", "TINGGI"].includes(data.urgensi) ? data.urgensi : "SEDANG";
    const issue = await this.prisma.issue.create({
      data: {
        nomorTiket,
        pelaporId: actorId,
        labId: data.labId,
        itemId: data.itemId || null,
        kategori: data.kategori,
        urgensi,
        deskripsi: data.deskripsi,
        fotoUrls: data.fotoUrls || [],
        status: "BARU",
        dueAt: addDays(todayJakarta(), SLA_DAYS[urgensi] || 3),
      },
    });
    if (data.itemId) {
      await this.prisma.inventoryItem.update({ where: { id: data.itemId }, data: { kondisi: "RUSAK" } });
    }
    await this.prisma.issueHistory.create({ data: { issueId: issue.id, status: "BARU", catatan: "Tiket dibuat", actorId } });
    await this.audit.log({ actorId, action: "CREATE_ISSUE", objectType: "Issue", objectId: issue.id, newValue: issue });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KENDALA_BARU", `Kendala baru: ${issue.nomorTiket} (${issue.kategori})`);
    return issue;
  }

  /** Laporan dari halaman publik: tanpa akun, identitas cukup nama + NIM. */
  async createPublic(data: any) {
    const lab = await this.prisma.lab.findUnique({ where: { id: data.labId } });
    if (!lab || lab.deletedAt || lab.status !== "AKTIF") throw new BadRequestException("Lab tidak tersedia");

    const nomorTiket = await this.genTicket();
    const urgensi = "SEDANG";
    const issue = await this.prisma.issue.create({
      data: {
        nomorTiket,
        pelaporId: null,
        namaPelapor: data.namaPelapor.trim(),
        nim: data.nim.trim(),
        labId: data.labId,
        kategori: data.kategori,
        urgensi,
        deskripsi: data.deskripsi.trim(),
        fotoUrls: Array.isArray(data.fotoUrls)
          ? data.fotoUrls.filter((u: unknown) => typeof u === "string" && u.startsWith("/uploads/")).slice(0, 4)
          : [],
        status: "BARU",
        dueAt: addDays(todayJakarta(), SLA_DAYS[urgensi] || 3),
      },
    });
    await this.prisma.issueHistory.create({
      data: { issueId: issue.id, status: "BARU", catatan: "Tiket dibuat melalui halaman publik", actorId: "publik" },
    });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KENDALA_BARU", `Kendala publik: ${issue.nomorTiket} (${issue.kategori})`);

    return {
      nomorTiket: issue.nomorTiket,
      status: issue.status,
      kategori: issue.kategori,
      createdAt: issue.createdAt,
    };
  }

  async verify(id: string, penanggungJawabId: string, catatan: string | undefined, actorId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException("Tiket tidak ditemukan");
    if (issue.status !== "BARU") throw new BadRequestException("Hanya tiket berstatus Baru yang dapat diverifikasi");
    if (penanggungJawabId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: penanggungJawabId } });
      if (!assignee || assignee.deletedAt) throw new BadRequestException("Penanggung jawab tidak valid");
    }
    const updated = await this.prisma.issue.update({ where: { id }, data: { status: "DIVERIFIKASI", penanggungJawabId: penanggungJawabId || null } });
    await this.prisma.issueHistory.create({ data: { issueId: id, status: "DIVERIFIKASI", catatan: catatan || "Diverifikasi", actorId } });
    await this.audit.log({ actorId, action: "VERIFY_ISSUE", objectType: "Issue", objectId: id, oldValue: issue, newValue: updated });
    if (penanggungJawabId) await this.notif.create(penanggungJawabId, "KENDALA_DITUGASKAN", `Anda ditugaskan menangani ${issue.nomorTiket}`);
    if (issue.pelaporId) await this.notif.create(issue.pelaporId, "KENDALA_DIVERIFIKASI", `Kendala ${issue.nomorTiket} telah diverifikasi`);
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
    const updated = await this.prisma.issue.update({
      where: { id },
      data: { status: status as any, resolvedAt: status === "SELESAI" ? new Date() : issue.resolvedAt },
    });
    await this.prisma.issueHistory.create({ data: { issueId: id, status: status as any, catatan: catatan || "", actorId } });
    await this.audit.log({ actorId, action: "UPDATE_ISSUE_STATUS", objectType: "Issue", objectId: id, oldValue: { status: issue.status }, newValue: { status } });
    if (issue.pelaporId) await this.notif.create(issue.pelaporId, "KENDALA_STATUS", `Kendala ${issue.nomorTiket} berstatus ${status}`);
    return updated;
  }

  async reopen(id: string, catatan: string | undefined, actor: { sub: string; role: string }) {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException("Tiket tidak ditemukan");
    if (actor.role === "USER" && issue.pelaporId !== actor.sub) throw new ForbiddenException("Tidak berhak membuka tiket ini");
    if (issue.status !== "SELESAI") throw new BadRequestException("Hanya tiket selesai yang dapat dibuka kembali");
    const updated = await this.prisma.issue.update({ where: { id }, data: { status: "DIVERIFIKASI", resolvedAt: null } });
    await this.prisma.issueHistory.create({ data: { issueId: id, status: "DIVERIFIKASI", catatan: catatan || "Dibuka kembali oleh pelapor", actorId: actor.sub } });
    await this.audit.log({ actorId: actor.sub, action: "REOPEN_ISSUE", objectType: "Issue", objectId: id });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "KENDALA_REOPEN", `Kendala ${issue.nomorTiket} dibuka kembali`);
    return updated;
  }
}
