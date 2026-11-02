import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { BookingsReminderService } from "./bookings-reminder.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsReminderService, RolesGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
