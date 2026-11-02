import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [PrismaModule, AuditModule, AuthModule], controllers: [UsersController], providers: [UsersService, RolesGuard] })
export class UsersModule {}
