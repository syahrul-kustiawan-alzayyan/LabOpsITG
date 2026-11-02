import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

function timeToMin(t: string): number { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function timeOverlap(aS: string, aE: string, bS: string, bE: string): boolean {
  return timeToMin(aS) < timeToMin(bE) && timeToMin(aE) > timeToMin(bS);
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  async checkAvailability(labId: string, tanggal: Date, jamMulai: string, jamSelesai: string, excludeId?: string): Promise<{ ok: boolean; reason?: string }> {
    if (timeToMin(jamMulai) >= timeToMin(jamSelesai)) return { ok: false, reason: "Jam mulai harus sebelum jam selesai" };
    const lab = await this.prisma.lab.findUnique({ where: { id: labId } });
    if (!lab || lab.deletedAt || lab.status !== "AKTIF") return { ok: false, reason: "Lab tidak tersedia" };

    // approved bookings same day overlapping
    const bookings = await this.prisma.booking.findMany({
      where: { labId, tanggal, status: "DISETUJUI", deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    for (const b of bookings) {
      if (timeOverlap(b.jamMulai, b.jamSelesai, jamMulai, jamSelesai)) return { ok: false, reason: "Slot sudah dibooking (peminjaman disetujui)" };
    }
    // schedules on same day-of-week within date range
    const hari = tanggal.getDay();
    const schedules = await this.prisma.schedule.findMany({ where: { labId, hari, deletedAt: null, status: "AKTIF" } });
    for (const s of schedules) {
      if (tanggal >= s.tanggalMulai && tanggal <= s.tanggalSelesai) {
        if (timeOverlap(s.jamMulai, s.jamSelesai, jamMulai, jamSelesai)) return { ok: false, reason: "Slot bentrok dengan jadwal praktikum" };
      }
    }
    return { ok: true };
  }

  findAll(q: { peminjamId?: string; labId?: string; status?: string; from?: string; to?: string }) {
    const where: any = { deletedAt: null };
    if (q.peminjamId) where.peminjamId = q.peminjamId;
    if (q.labId) where.labId = q.labId;
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      where.tanggal = {};
      if (q.from) where.tanggal.gte = new Date(q.from);
      if (q.to) where.tanggal.lte = new Date(q.to);
    }
    return this.prisma.booking.findMany({
      where,
      include: { peminjam: { select: { nama: true, email: true } }, lab: { select: { kode: true, nama: true } }, pemroses: { select: { nama: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findOne(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: { peminjam: { select: { nama: true, email: true } }, lab: { select: { kode: true, nama: true } }, pemroses: { select: { nama: true } } } });
  }

  async create(data: any, actorId: string, actorRole: string) {
    const tanggal = new Date(data.tanggal);
    const av = await this.checkAvailability(data.labId, tanggal, data.jamMulai, data.jamSelesai);
    if (!av.ok) throw new BadRequestException(av.reason);
    const peminjamId = (actorRole === "ADMIN_SYSTEM" || actorRole === "COORDINATOR") && data.peminjamId ? data.peminjamId : actorId;
    const status = (actorRole === "ADMIN_SYSTEM" || actorRole === "COORDINATOR") && data.status ? data.status : "DIAJUKAN";
    const booking = await this.prisma.booking.create({
      data: {
        peminjamId,
        labId: data.labId,
        tanggal,
        jamMulai: data.jamMulai,
        jamSelesai: data.jamSelesai,
        keperluan: data.keperluan,
        jumlahPeserta: data.jumlahPeserta ? Number(data.jumlahPeserta) : null,
        kebutuhanKhusus: data.kebutuhanKhusus,
        lampiranUrl: data.lampiranUrl,
        status,
        pemrosesId: status === "DISETUJUI" ? actorId : null,
      },
    });
    await this.audit.log({ actorId, action: "CREATE_BOOKING", objectType: "Booking", objectId: booking.id, newValue: booking });
    // notify coordinators if new pending
    if (status === "DIAJUKAN") {
      const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
      for (const c of coords) await this.notif.create(c.id, "PEMINJAMAN_BARU", `Pengajuan peminjaman baru dari ${booking.peminjamId}`);
    }
    // notify peminjam if auto-approved
    if (status === "DISETUJUI") await this.notif.create(peminjamId, "PEMINJAMAN_DISETUJUI", "Peminjaman lab Anda disetujui");
    return booking;
  }

  async approve(id: string, actorId: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || b.deletedAt) throw new NotFoundException("Peminjaman tidak ditemukan");
    if (b.status !== "DIAJUKAN") throw new BadRequestException("Hanya pengajuan berstatus Diajukan yang dapat disetujui");
    const av = await this.checkAvailability(b.labId, b.tanggal, b.jamMulai, b.jamSelesai, id);
    if (!av.ok) throw new BadRequestException(av.reason);
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: "DISETUJUI", pemrosesId: actorId } });
    await this.audit.log({ actorId, action: "APPROVE_BOOKING", objectType: "Booking", objectId: id, oldValue: b, newValue: updated });
    await this.notif.create(b.peminjamId, "PEMINJAMAN_DISETUJUI", "Peminjaman lab Anda disetujui");
    return updated;
  }

  async reject(id: string, alasan: string, actorId: string) {
    if (!alasan || !alasan.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || b.deletedAt) throw new NotFoundException("Peminjaman tidak ditemukan");
    if (b.status !== "DIAJUKAN") throw new BadRequestException("Hanya pengajuan berstatus Diajukan yang dapat ditolak");
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: "DITOLAK", pemrosesId: actorId, alasanKeputusan: alasan } });
    await this.audit.log({ actorId, action: "REJECT_BOOKING", objectType: "Booking", objectId: id, oldValue: b, newValue: updated });
    await this.notif.create(b.peminjamId, "PEMINJAMAN_DITOLAK", `Peminjaman lab ditolak: ${alasan}`);
    return updated;
  }

  async cancel(id: string, actorId: string, actorRole: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || b.deletedAt) throw new NotFoundException("Peminjaman tidak ditemukan");
    if (b.peminjamId !== actorId && actorRole !== "ADMIN_SYSTEM" && actorRole !== "COORDINATOR") throw new ForbiddenException("Tidak berhak");
    if (b.status !== "DIAJUKAN" && b.status !== "DISETUJUI") throw new BadRequestException("Peminjaman tidak dapat dibatalkan");
    // check before waktu pakai
    const now = new Date();
    const bookingDate = new Date(b.tanggal);
    if (bookingDate < new Date(now.toDateString())) throw new BadRequestException("Peminjaman sudah lewat, tidak dapat dibatalkan");
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: "DIBATALKAN" } });
    await this.audit.log({ actorId, action: "CANCEL_BOOKING", objectType: "Booking", objectId: id, oldValue: b, newValue: updated });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "PEMINJAMAN_DIBATALKAN", `Peminjaman lab dibatalkan oleh peminjam`);
    await this.notif.create(b.peminjamId, "PEMINJAMAN_DIBATALKAN", "Peminjaman lab Anda dibatalkan");
    return updated;
  }

  async markComplete(id: string, actorId: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException("Peminjaman tidak ditemukan");
    if (b.status !== "DISETUJUI") throw new BadRequestException("Hanya peminjaman disetujui yang dapat diselesaikan");
    return this.prisma.booking.update({ where: { id }, data: { status: "SELESAI" } });
  }
}
