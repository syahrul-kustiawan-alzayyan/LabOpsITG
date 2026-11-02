import { Injectable, OnModuleInit } from "@nestjs/common";
import * as cron from "node-cron";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class BookingsReminderService implements OnModuleInit {
  constructor(private prisma: PrismaService, private notif: NotificationsService) {}

  onModuleInit() {
    // daily 08:00: remind coordinators of pending bookings with tanggal = tomorrow
    cron.schedule("0 8 * * *", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const pending = await this.prisma.booking.findMany({
        where: { status: "DIAJUKAN", tanggal: { gte: tomorrow, lt: dayAfter } },
      });
      if (pending.length === 0) return;
      const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
      for (const c of coords) await this.notif.create(c.id, "PENGINGAT_PEMINJAMAN", `${pending.length} pengajuan peminjaman belum diproses (H-1)`);
    });
  }
}
