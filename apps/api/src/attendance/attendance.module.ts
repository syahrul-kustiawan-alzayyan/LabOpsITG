import { Module } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { AttendanceController } from "./attendance.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule, NotificationsModule], controllers: [AttendanceController], providers: [AttendanceService, RolesGuard] })
export class AttendanceModule {}
