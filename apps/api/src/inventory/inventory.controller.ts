import { Body, Controller, Get, Post, Put, Patch, Delete, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { InventoryService } from "./inventory.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("inventory")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private svc: InventoryService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Get("summary")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  summary() { return this.svc.summary(); }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findOne(@Param("id") id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  create(@Body() body: any, @Req() req: Request) { return this.svc.create(body, (req as any).user?.sub); }

  @Put(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  update(@Param("id") id: string, @Body() body: any, @Req() req: Request) { return this.svc.update(id, body, (req as any).user?.sub); }

  @Patch(":id/mutate")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  mutate(@Param("id") id: string, @Body() body: { labTujuanId: string }, @Req() req: Request) { return this.svc.mutate(id, body.labTujuanId, (req as any).user?.sub); }

  @Delete(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  remove(@Param("id") id: string, @Req() req: Request) { return this.svc.remove(id, (req as any).user?.sub); }

  @Post("import")
  @Roles("ADMIN_SYSTEM")
  importCsv(@Body() body: { rows: any[] }, @Req() req: Request) { return this.svc.importCsv(body.rows, (req as any).user?.sub); }
}
