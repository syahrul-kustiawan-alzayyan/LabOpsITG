import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto, RejectBookingDto } from "./dto/booking.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("bookings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private svc: BookingsService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findAll(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.findAll(q, { sub: user.sub, role: user.role });
  }

  @Get("availability/check")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  check(@Query() q: any) {
    return this.svc.checkAvailability(q.labId, q.tanggal, q.jamMulai, q.jamSelesai);
  }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findOne(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.findOne(id, { sub: user.sub, role: user.role });
  }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "INSTRUKTUR", "ASISTEN_DOSEN")
  create(@Body() body: CreateBookingDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(body, user.sub, user.role);
  }

  @Patch(":id/approve")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  approve(@Param("id") id: string, @Req() req: Request) {
    return this.svc.approve(id, (req as any).user.sub);
  }

  @Patch(":id/reject")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  reject(@Param("id") id: string, @Body() body: RejectBookingDto, @Req() req: Request) {
    return this.svc.reject(id, body.alasan, (req as any).user.sub);
  }

  @Patch(":id/cancel")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "INSTRUKTUR", "ASISTEN_DOSEN")
  cancel(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.cancel(id, user.sub, user.role);
  }

  @Patch(":id/complete")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  complete(@Param("id") id: string, @Req() req: Request) {
    return this.svc.markComplete(id, (req as any).user.sub);
  }
}
