import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { ProdiService } from "./prodi.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("prodi")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProdiController {
  constructor(private svc: ProdiService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER", "KAPRODI")
  findAll(@Query() q: any, @Req() req: Request) {
    return this.svc.findAll((req as any).user);
  }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER", "KAPRODI")
  findOne(@Param("id") id: string, @Req() req: Request) {
    return this.svc.findOne(id, (req as any).user);
  }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "KAPRODI")
  create(@Body() body: { kode: string; nama: string; status?: any }, @Req() req: Request) {
    return this.svc.create(body, (req as any).user);
  }

  @Put(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "KAPRODI")
  update(@Param("id") id: string, @Body() body: { nama?: string; status?: any }, @Req() req: Request) {
    return this.svc.update(id, body, (req as any).user);
  }

  @Delete(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "KAPRODI")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.svc.remove(id, (req as any).user);
  }

  @Post(":id/kaprodi")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "KAPRODI")
  setKaprodi(@Param("id") id: string, @Body() body: { kaprodiId: string }, @Req() req: Request) {
    return this.svc.setKaprodi(id, body.kaprodiId, (req as any).user);
  }
}
