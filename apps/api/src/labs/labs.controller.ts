import { Body, Controller, Get, Post, Put, Patch, Delete, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { LabsService } from "./labs.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("labs")
export class LabsController {
  constructor(private labs: LabsService) {}

  @Get()
  findAll(@Query() q: any) { return this.labs.findAll(q); }

  @Get(":id")
  findOne(@Param("id") id: string) { return this.labs.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  create(@Body() body: any, @Req() req: Request) { return this.labs.create(body, (req as any).user?.sub); }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  update(@Param("id") id: string, @Body() body: any, @Req() req: Request) { return this.labs.update(id, body, (req as any).user?.sub); }

  @Patch(":id/regenerate-qr")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  regenerateQr(@Param("id") id: string, @Req() req: Request) { return this.labs.regenerateQr(id, (req as any).user?.sub); }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  remove(@Param("id") id: string, @Req() req: Request) { return this.labs.remove(id, (req as any).user?.sub); }
}
