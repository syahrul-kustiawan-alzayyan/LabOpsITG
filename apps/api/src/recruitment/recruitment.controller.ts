import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { RecruitmentService } from "./recruitment.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("recruitment")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecruitmentController {
  constructor(private svc: RecruitmentService) {}

  // Periods
  @Get("periods")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN", "KAPRODI")
  periods(@Query() q: any) { return this.svc.findPeriods(q.status, q.periodeId); }

  @Get("periods/:id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  period(@Param("id") id: string) { return this.svc.findPeriod(id); }

  @Post("periods")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  createPeriod(@Body() body: any, @Req() req: Request) { return this.svc.createPeriod(body, (req as any).user.sub); }

  @Patch("periods/:id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  updatePeriod(@Param("id") id: string, @Body() body: any, @Req() req: Request) { return this.svc.updatePeriod(id, body, (req as any).user.sub); }

  @Patch("periods/:id/close")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  closePeriod(@Param("id") id: string, @Req() req: Request) { return this.svc.closePeriod(id, (req as any).user.sub); }

  // Applications
  @Get("applications")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "KAPRODI")
  applications(@Query() q: any) { return this.svc.findApplications(q); }

  @Get("applications/mine")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "INSTRUKTUR", "ASISTEN_DOSEN")
  mine(@Req() req: Request) { return this.svc.findMyApplications((req as any).user.sub); }

  @Post("applications")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "INSTRUKTUR", "ASISTEN_DOSEN")
  apply(@Body() body: any, @Req() req: Request) { return this.svc.apply(body, (req as any).user.sub); }

  @Patch("applications/:id/status")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  updateStatus(@Param("id") id: string, @Body() body: { status: string; catatan?: string }, @Req() req: Request) {
    return this.svc.updateStatus(id, body.status, body.catatan, (req as any).user.sub);
  }

  @Patch("applications/:id/interview")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  interview(@Param("id") id: string, @Body() body: { tanggal: string }, @Req() req: Request) {
    return this.svc.setInterview(id, body.tanggal, (req as any).user.sub);
  }
}
