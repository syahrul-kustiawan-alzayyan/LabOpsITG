import { Body, Controller, Delete, Get, Patch, Post, Param, Query, UseGuards, Req } from "@nestjs/common";
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
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  scan(@Body() body: { qrToken: string }, @Req() req: Request) {
    return this.svc.scan(body.qrToken, (req as any).user.sub);
  }

  @Post("manual")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  manual(@Body() body: { sesiId: string; userId: string; status: string; reason: string; tanggal?: string }, @Req() req: Request) {
    return this.svc.manual(body.sesiId, body.userId, body.status, body.reason, (req as any).user.sub, body.tanggal);
  }

  @Post("request-correction")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "INSTRUKTUR", "ASISTEN_DOSEN")
  requestCorrection(@Body() body: { sesiId: string; reason: string }, @Req() req: Request) {
    return this.svc.requestCorrection(body.sesiId, body.reason, (req as any).user.sub);
  }

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, { sub: user.sub, role: user.role, subRoles: user.subRoles });
  }

  @Get("team")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  team(@Query("date") date: string | undefined, @Req() req: Request) {
    return this.svc.team(date, (req as any).user);
  }

  @Post("team")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "INSTRUKTUR")
  markTeam(
    @Body() body: { sesiId: string; date?: string; records: { userId: string; status: string; reason?: string }[] },
    @Req() req: Request,
  ) {
    return this.svc.markTeam(body.sesiId, body.records, (req as any).user, body.date);
  }

  @Post("instruktur/session")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "INSTRUKTUR")
  createInstrukturSession(
    @Body() body: { mataKuliahId: string; kelas: string; tanggal?: string; pertemuanKe?: number; materi?: string; records: { userId: string; status: string; reason?: string }[] },
    @Req() req: Request,
  ) {
    return this.svc.createInstrukturSession(body, (req as any).user);
  }

  @Patch("instruktur/sessions/:sesiId")
  @Roles("ADMIN_SYSTEM", "INSTRUKTUR")
  updateInstrukturSession(
    @Param("sesiId") sesiId: string,
    @Body() body: { tanggal?: string; pertemuanKe?: number | null; materi?: string | null; records: { id: string; status: string }[] },
    @Req() req: Request,
  ) {
    return this.svc.updateInstrukturSession(sesiId, body, (req as any).user);
  }

  @Post("validate")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  validateScan(@Body() body: { qrToken: string }, @Req() req: Request) {
    return this.svc.validateScan(body.qrToken, (req as any).user.sub);
  }

  @Post("validate/confirm")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  confirmValidation(@Body() body: { qrToken: string }, @Req() req: Request) {
    return this.svc.confirmValidation(body.qrToken, (req as any).user.sub);
  }

  @Get("admin/stats")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  adminStats(@Req() req: Request) {
    return this.svc.adminStats();
  }

  @Get("admin/courses")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  adminCourses(@Req() req: Request) {
    return this.svc.adminCourses();
  }

  @Get("admin/courses/:courseId")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  adminCourseDetail(@Param("courseId") courseId: string) {
    return this.svc.adminCourseDetail(courseId);
  }

  @Get("instruktur/courses")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  instrukturCourses(@Req() req: Request) {
    return this.svc.instrukturCourses((req as any).user.sub);
  }

  @Get("instruktur/sessions")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  instrukturSessions(@Req() req: Request) {
    return this.svc.instrukturSessions((req as any).user.sub);
  }

  @Get("recap/:sesiId")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  recap(@Param("sesiId") sesiId: string) { return this.svc.recap(sesiId); }

  @Get("enrollments/:sesiId")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  enrollments(@Param("sesiId") sesiId: string) { return this.svc.enrollments(sesiId); }

  @Post("enrollments")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  addEnrollment(@Body() body: { sesiId: string; userId: string }, @Req() req: Request) {
    return this.svc.addEnrollment(body.sesiId, body.userId, (req as any).user.sub);
  }

  @Delete("enrollments/:id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  removeEnrollment(@Param("id") id: string, @Req() req: Request) {
    return this.svc.removeEnrollment(id, (req as any).user.sub);
  }

  @Post("session-token")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  createSessionToken(@Body() body: { sesiId: string }, @Req() req: Request) {
    return this.svc.createSessionToken(body.sesiId, (req as any).user.sub);
  }

  @Get("session-token/mine")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  mySessionTokens(@Req() req: Request) {
    return this.svc.activeSessionTokens((req as any).user.sub);
  }
}
