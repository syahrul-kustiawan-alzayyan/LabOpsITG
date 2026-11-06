import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";
import { PeriodeController } from "./periode.controller";
import { PeriodeService } from "./periode.service";

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [PeriodeController],
  providers: [PeriodeService, RolesGuard],
  exports: [PeriodeService],
})
export class PeriodeModule {}
