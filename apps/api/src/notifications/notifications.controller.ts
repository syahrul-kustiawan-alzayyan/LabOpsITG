import { Controller, Get, Patch, Param, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list(@Req() req: Request) { return this.svc.listForUser((req as any).user.sub); }

  @Get("unread-count")
  count(@Req() req: Request) { return this.svc.unreadCount((req as any).user.sub); }

  @Patch(":id/read")
  read(@Param("id") id: string, @Req() req: Request) { return this.svc.markRead(id, (req as any).user.sub); }
}
