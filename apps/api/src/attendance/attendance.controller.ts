import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { AttendanceService } from "./attendance.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("attendance")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private svc: AttendanceService) {}

  @Post("scan")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  scan(@Body() body: { qrToken: string }, @Req() req: Request) {
    return this.svc.scan(body.qrToken, (req as any).user.sub);
  }

  @Post("manual")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  manual(@Body() body: { sesiId: string; userId: string; status: string; reason: string }, @Req() req: Request) {
    return this.svc.manual(body.sesiId, body.userId, body.status, body.reason, (req as any).user.sub);
  }

  @Post("request-correction")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER")
  requestCorrection(@Body() body: { sesiId: string; reason: string }, @Req() req: Request) {
    return this.svc.requestCorrection(body.sesiId, body.reason, (req as any).user.sub);
  }

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role === "USER") q.userId = user.sub;
    return this.svc.list(q);
  }

  @Get("recap/:sesiId")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  recap(@Param("sesiId") sesiId: string) { return this.svc.recap(sesiId); }
}
