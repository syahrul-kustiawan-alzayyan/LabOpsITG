import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { PeriodeService } from "./periode.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("periode")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodeController {
  constructor(private svc: PeriodeService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER", "KAPRODI")
  findAll(@Req() req: Request) {
    return this.svc.findAll((req as any).user);
  }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER", "KAPRODI")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  create(@Body() body: { nama: string; kode: string; tanggalMulai: string; tanggalSelesai: string; status?: any; isCurrent?: boolean }, @Req() req: Request) {
    return this.svc.create(body, (req as any).user);
  }

  @Put(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  update(@Param("id") id: string, @Body() body: { nama?: string; tanggalMulai?: string; tanggalSelesai?: string; status?: any; isCurrent?: boolean }, @Req() req: Request) {
    return this.svc.update(id, body, (req as any).user);
  }

  @Delete(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.svc.remove(id, (req as any).user);
  }

  @Post(":id/current")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  setCurrent(@Param("id") id: string, @Req() req: Request) {
    return this.svc.setCurrent(id, (req as any).user);
  }
}
