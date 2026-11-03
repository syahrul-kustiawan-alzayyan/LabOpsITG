import { Module } from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service";
import { RecruitmentController } from "./recruitment.controller";
import { RecruitmentPublicController } from "./recruitment-public.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule, NotificationsModule], controllers: [RecruitmentController, RecruitmentPublicController], providers: [RecruitmentService, RolesGuard] })
export class RecruitmentModule {}
