import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { IssuesService } from "./issues.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("issues")
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuesController {
  constructor(private svc: IssuesService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  findAll(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role === "USER") q.pelaporId = user.sub;
    return this.svc.findAll(q);
  }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  findOne(@Param("id") id: string) { return this.svc.findOne(id); }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER")
  create(@Body() body: any, @Req() req: Request) { return this.svc.create(body, (req as any).user.sub); }

  @Patch(":id/verify")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  verify(@Param("id") id: string, @Body() body: { penanggungJawabId: string; catatan?: string }, @Req() req: Request) {
    return this.svc.verify(id, body.penanggungJawabId, body.catatan, (req as any).user.sub);
  }

  @Patch(":id/status")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  updateStatus(@Param("id") id: string, @Body() body: { status: string; catatan?: string }, @Req() req: Request) {
    return this.svc.updateStatus(id, body.status, body.catatan, (req as any).user.sub);
  }

  @Patch(":id/reopen")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER")
  reopen(@Param("id") id: string, @Body() body: { catatan?: string }, @Req() req: Request) {
    return this.svc.reopen(id, body?.catatan, (req as any).user.sub);
  }
}
