import { Module } from "@nestjs/common";
import { LabsService } from "./labs.service";
import { LabsController } from "./labs.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule], controllers: [LabsController], providers: [LabsService, RolesGuard] })
export class LabsModule {}
