import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuthModule], controllers: [AuditController], providers: [AuditService, RolesGuard], exports: [AuditService] })
export class AuditModule {}
