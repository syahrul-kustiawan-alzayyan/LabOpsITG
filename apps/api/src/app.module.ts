import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";
import { AuditModule } from "./audit/audit.module";
import { LabsModule } from "./labs/labs.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { BookingsModule } from "./bookings/bookings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { IssuesModule } from "./issues/issues.module";
import { InventoryModule } from "./inventory/inventory.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { ReportsModule } from "./reports/reports.module";
import { RecruitmentModule } from "./recruitment/recruitment.module";
import { FilesModule } from "./files/files.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UsersModule, HealthModule, AuditModule, LabsModule, SchedulesModule, BookingsModule, NotificationsModule, IssuesModule, InventoryModule, AttendanceModule, ReportsModule, RecruitmentModule, FilesModule],
})
export class AppModule {}
