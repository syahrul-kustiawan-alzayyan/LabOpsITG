import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CoursesService } from "./courses.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("courses")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private svc: CoursesService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Post("personel")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  createPersonel(@Body() body: any, @Req() req: Request) {
    return this.svc.createPersonel(body, (req as any).user?.sub);
  }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  create(@Body() body: any, @Req() req: Request) {
    return this.svc.create(body, (req as any).user?.sub);
  }

  @Put(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  update(@Param("id") id: string, @Body() body: any, @Req() req: Request) {
    return this.svc.update(id, body, (req as any).user?.sub);
  }

  @Delete(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.svc.remove(id, (req as any).user?.sub);
  }

  @Post(":id/kelas")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  createKelas(@Param("id") id: string, @Body() body: any, @Req() req: Request) {
    return this.svc.createKelas(id, body, (req as any).user?.sub);
  }

  @Put(":id/kelas/:scheduleId")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  updateKelas(@Param("id") id: string, @Param("scheduleId") scheduleId: string, @Body() body: any, @Req() req: Request) {
    return this.svc.updateKelas(id, scheduleId, body, (req as any).user?.sub);
  }

  @Delete(":id/kelas/:scheduleId")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  removeKelas(@Param("id") id: string, @Param("scheduleId") scheduleId: string, @Req() req: Request) {
    return this.svc.removeKelas(id, scheduleId, (req as any).user?.sub);
  }
}
