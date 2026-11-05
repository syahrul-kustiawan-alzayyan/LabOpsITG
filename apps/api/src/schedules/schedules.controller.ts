import { Body, Controller, Get, Post, Put, Patch, Delete, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { SchedulesService } from "./schedules.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("schedules")
export class SchedulesController {
  constructor(private svc: SchedulesService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Get("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findMine(@Req() req: Request) { return this.svc.findMine((req as any).user.sub); }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  findOne(@Param("id") id: string) { return this.svc.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  create(@Body() body: any, @Req() req: Request) { return this.svc.create(body, (req as any).user?.sub); }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  update(@Param("id") id: string, @Body() body: any, @Req() req: Request) { return this.svc.update(id, body, (req as any).user?.sub); }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  remove(@Param("id") id: string, @Req() req: Request) { return this.svc.remove(id, (req as any).user?.sub); }

  @Post(":id/duplicate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  duplicate(@Param("id") id: string, @Body() body: any, @Req() req: Request) { return this.svc.duplicate(id, body, (req as any).user?.sub); }

  @Post("import")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  importCsv(@Body() body: { rows: any[] }, @Req() req: Request) { return this.svc.importCsv(body.rows, (req as any).user?.sub); }
}
