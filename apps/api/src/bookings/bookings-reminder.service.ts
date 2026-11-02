import { Injectable, OnModuleInit } from "@nestjs/common";
import * as cron from "node-cron";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { addDays, todayJakarta } from "../common/time";

@Injectable()
export class BookingsReminderService implements OnModuleInit {
  constructor(private prisma: PrismaService, private notif: NotificationsService) {}

  onModuleInit() {
    // setiap hari 08:00 WIB: ingatkan koordinator untuk pengajuan besok yang belum diproses
    cron.schedule("0 8 * * *", async () => {
      const tomorrow = addDays(todayJakarta(), 1);
      const dayAfter = addDays(tomorrow, 1);
      const pending = await this.prisma.booking.findMany({
        where: { status: "DIAJUKAN", tanggal: { gte: tomorrow, lt: dayAfter }, deletedAt: null },
      });
      if (pending.length === 0) return;
      const coords = await this.prisma.user.findMany({ where: { role: { in: ["COORDINATOR", "ADMIN_SYSTEM"] }, status: "ACTIVE", deletedAt: null } });
      for (const c of coords) await this.notif.create(c.id, "PENGINGAT_PEMINJAMAN", `${pending.length} pengajuan peminjaman belum diproses (H-1)`);
    }, { timezone: "Asia/Jakarta" });
  }
}
