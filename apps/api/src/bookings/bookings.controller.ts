import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { BookingsService } from "./bookings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("bookings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private svc: BookingsService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  findAll(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    // regular users only see their own
    if (user.role === "USER") q.peminjamId = user.sub;
    return this.svc.findAll(q);
  }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  findOne(@Param("id") id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER")
  create(@Body() body: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(body, user.sub, user.role);
  }

  @Patch(":id/approve")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  approve(@Param("id") id: string, @Req() req: Request) { return this.svc.approve(id, (req as any).user.sub); }

  @Patch(":id/reject")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  reject(@Param("id") id: string, @Body() body: { alasan: string }, @Req() req: Request) {
    return this.svc.reject(id, body.alasan, (req as any).user.sub);
  }

  @Patch(":id/cancel")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER")
  cancel(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.cancel(id, user.sub, user.role);
  }

  @Patch(":id/complete")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  complete(@Param("id") id: string, @Req() req: Request) { return this.svc.markComplete(id, (req as any).user.sub); }

  @Get("availability/check")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  check(@Query() q: any) {
    return this.svc.checkAvailability(q.labId, new Date(q.tanggal), q.jamMulai, q.jamSelesai);
  }
}
