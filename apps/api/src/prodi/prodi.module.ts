import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";
import { ProdiController } from "./prodi.controller";
import { ProdiService } from "./prodi.service";

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ProdiController],
  providers: [ProdiService, RolesGuard],
  exports: [ProdiService],
})
export class ProdiModule {}
