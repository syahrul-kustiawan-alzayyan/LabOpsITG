import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuthModule], controllers: [ReportsController], providers: [ReportsService, RolesGuard] })
export class ReportsModule {}
