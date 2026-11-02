import { Module } from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { IssuesController } from "./issues.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule, NotificationsModule], controllers: [IssuesController], providers: [IssuesService, RolesGuard] })
export class IssuesModule {}
