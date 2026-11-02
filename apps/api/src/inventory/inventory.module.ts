import { Module } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { InventoryController } from "./inventory.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule], controllers: [InventoryController], providers: [InventoryService, RolesGuard] })
export class InventoryModule {}
