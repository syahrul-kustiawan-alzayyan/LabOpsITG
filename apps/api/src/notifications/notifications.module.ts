import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";
import { NotificationsController } from "./notifications.controller";

@Module({ imports: [PrismaModule, AuthModule], controllers: [NotificationsController], providers: [NotificationsService, RolesGuard], exports: [NotificationsService] })
export class NotificationsModule {}
