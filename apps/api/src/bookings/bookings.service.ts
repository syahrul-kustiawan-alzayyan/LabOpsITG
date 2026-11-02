import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { addDays, dayOfWeekJakarta, jakartaDayRange, parseTimeToMinutes, startOfJakartaDay, todayJakarta } from "../common/time";

function timeOverlap(aS: string, aE: string, bS: string, bE: string): boolean {
  return parseTimeToMinutes(aS) < parseTimeToMinutes(bE) && parseTimeToMinutes(aE) > parseTimeToMinutes(bS);
}

const MAX_LIMIT = 500;

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private notif: NotificationsService) {}

  async checkAvailability(labId: string, tanggal: Date | string, jamMulai: string, jamSelesai: string, excludeId?: string): Promise<{ ok: boolean; reason?: string }> {
    if (!labId) return { ok: false, reason: "Lab wajib dipilih" };
    if (parseTimeToMinutes(jamMulai) >= parseTimeToMinutes(jamSelesai)) return { ok: false, reason: "Jam mulai harus sebelum jam selesai" };
    const day = startOfJakartaDay(tanggal);
    if (Number.isNaN(day.getTime())) return { ok: false, reason: "Tanggal tidak valid" };

    const lab = await this.prisma.lab.findUnique({ where: { id: labId } });
    if (!lab || lab.deletedAt || lab.status !== "AKTIF") return { ok: false, reason: "Lab tidak tersedia" };

    // peminjaman disetujui pada hari yang sama
    const bookings = await this.prisma.booking.findMany({
      where: {
        labId,
        tanggal: jakartaDayRange(day),
        status: "DISETUJUI",
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    for (const b of bookings) {
      if (timeOverlap(b.jamMulai, b.jamSelesai, jamMulai, jamSelesai)) {
        return { ok: false, reason: "Slot sudah dibooking (peminjaman disetujui)" };
      }
    }

    // jadwal praktikum pada hari yang sama dalam rentang semester
    const hari = dayOfWeekJakarta(day);
    const schedules = await this.prisma.schedule.findMany({ where: { labId, hari, deletedAt: null, status: "AKTIF" } });
    for (const s of schedules) {
      const mulai = startOfJakartaDay(s.tanggalMulai);
      const selesai = startOfJakartaDay(s.tanggalSelesai);
      if (day >= mulai && day <= selesai) {
        if (timeOverlap(s.jamMulai, s.jamSelesai, jamMulai, jamSelesai)) {
          return { ok: false, reason: "Slot bentrok dengan jadwal praktikum" };
        }
      }
    }
    return { ok: true };
  }

  async findAll(q: { peminjamId?: string; labId?: string; status?: string; from?: string; to?: string; page?: string | number; limit?: string | number }, actor?: { sub: string; role: string }) {
    const where: any = { deletedAt: null };
    if (actor?.role === "USER" && actor.sub) where.peminjamId = actor.sub;
    else if (q.peminjamId) where.peminjamId = q.peminjamId;
    if (q.labId) where.labId = q.labId;
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      where.tanggal = {};
      if (q.from) where.tanggal.gte = startOfJakartaDay(q.from);
      if (q.to) where.tanggal.lte = addDays(startOfJakartaDay(q.to), 1);
    }
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || 200));
    return this.prisma.booking.findMany({
      where,
      include: {
        peminjam: { select: { id: true, nama: true, email: true } },
        lab: { select: { kode: true, nama: true } },
        pemroses: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string, actor?: { sub: string; role: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        peminjam: { select: { id: true, nama: true, email: true } },
        lab: { select: { kode: true, nama: true } },
        pemroses: { select: { nama: true } },
      },
    });
    if (!booking || booking.deletedAt) throw new NotFoundException("Peminjaman tidak ditemukan");
    if (actor && actor.role === "USER" && booking.peminjamId !== actor.sub) {
      throw new ForbiddenException("Tidak berhak melihat peminjaman ini");
    }
    return booking;
  }

  async create(data: any, actorId: string, actorRole: string) {
    const tanggal = startOfJakartaDay(data.tanggal);
    if (!data.labId || !data.keperluan) throw new BadRequestException("Lab dan keperluan wajib diisi");
    const av = await this.checkAvailability(data.labId, tanggal, data.jamMulai, data.jamSelesai);
    if (!av.ok) throw new BadRequestException(av.reason);
    const isManager = actorRole === "ADMIN_SYSTEM" || actorRole === "COORDINATOR";
    const peminjamId = isManager && data.peminjamId ? data.peminjamId : actorId;
    const status = isManager && data.status ? data.status : "DIAJUKAN";
    if (!["DIAJUKAN", "DISETUJUI"].includes(status)) throw new BadRequestException("Status awal tidak valid");

    const booking = await this.prisma.booking.create({
      data: {
        peminjamId,
        labId: data.labId,
        tanggal,
        jamMulai: data.jamMulai,
        jamSelesai: data.jamSelesai,
        keperluan: data.keperluan,
        jumlahPeserta: data.jumlahPeserta ? Number(data.jumlahPeserta) : null,
        kebutuhanKhusus: data.kebutuhanKhusus || null,
        lampiranUrl: data.lampiranUrl || null,
        status,
        pemrosesId: status === "DISETUJUI" ? actorId : null,
      },
    });
    await this.audit.log({ actorId, action: "CREATE_BOOKING", objectType: "Booking", objectId: booking.id, newValue: booking });
    if (status === "DIAJUKAN") {
      const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
      for (const c of coords) await this.notif.create(c.id, "PEMINJAMAN_BARU", `Pengajuan peminjaman baru: ${data.keperluan}`);
    }
    if (status === "DISETUJUI") await this.notif.create(peminjamId, "PEMINJAMAN_DISETUJUI", "Peminjaman lab Anda disetujui");
    return booking;
  }

  async approve(id: string, actorId: string) {
    // Transaksi + update bersyarat mencegah double-approve saat dua koordinator menekan bersamaan.
    const result = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b || b.deletedAt) throw new NotFoundException("Peminjaman tidak ditemukan");
      if (b.status !== "DIAJUKAN") throw new BadRequestException("Hanya pengajuan berstatus Diajukan yang dapat disetujui");
      const av = await this.checkAvailability(b.labId, b.tanggal, b.jamMulai, b.jamSelesai, id);
      if (!av.ok) throw new ConflictException(av.reason);
      const claimed = await tx.booking.updateMany({
        where: { id, status: "DIAJUKAN" },
        data: { status: "DISETUJUI", pemrosesId: actorId },
      });
      if (claimed.count === 0) throw new ConflictException("Pengajuan sudah diproses oleh pengguna lain");
      return tx.booking.findUnique({ where: { id } });
    });
    await this.audit.log({ actorId, action: "APPROVE_BOOKING", objectType: "Booking", objectId: id, newValue: result });
    await this.notif.create(result!.peminjamId, "PEMINJAMAN_DISETUJUI", "Peminjaman lab Anda disetujui");
    return result;
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
    if (startOfJakartaDay(b.tanggal) < todayJakarta()) throw new BadRequestException("Peminjaman sudah lewat, tidak dapat dibatalkan");
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: "DIBATALKAN" } });
    await this.audit.log({ actorId, action: "CANCEL_BOOKING", objectType: "Booking", objectId: id, oldValue: b, newValue: updated });
    const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
    for (const c of coords) await this.notif.create(c.id, "PEMINJAMAN_DIBATALKAN", "Peminjaman lab dibatalkan oleh peminjam");
    await this.notif.create(b.peminjamId, "PEMINJAMAN_DIBATALKAN", "Peminjaman lab Anda dibatalkan");
    return updated;
  }

  async markComplete(id: string, actorId: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException("Peminjaman tidak ditemukan");
    if (b.status !== "DISETUJUI") throw new BadRequestException("Hanya peminjaman disetujui yang dapat diselesaikan");
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: "SELESAI" } });
    await this.audit.log({ actorId, action: "COMPLETE_BOOKING", objectType: "Booking", objectId: id, oldValue: b, newValue: updated });
    return updated;
  }
}
