import { Module } from "@nestjs/common";
import { SchedulesService } from "./schedules.service";
import { SchedulesController } from "./schedules.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule], controllers: [SchedulesController], providers: [SchedulesService, RolesGuard] })
export class SchedulesModule {}
