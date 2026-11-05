import { Body, Controller, Get, Post, Put, Patch, Param, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  findAll(@Query() q: any) { return this.users.findAll(q); }

  @Get(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  findOne(@Param("id") id: string) { return this.users.findOne(id); }

  @Post()
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  create(@Body() body: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.users.create(body, { id: user.sub, role: user.role });
  }

  @Put(":id")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  update(@Param("id") id: string, @Body() body: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.users.update(id, body, { id: user.sub, role: user.role });
  }

  @Patch(":id/deactivate")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  deactivate(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.users.deactivate(id, { id: user.sub, role: user.role });
  }

  @Patch(":id/reset-password")
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  resetPassword(@Param("id") id: string, @Body() body: { password: string }, @Req() req: Request) {
    const user = (req as any).user;
    return this.users.resetPassword(id, body.password, { id: user.sub, role: user.role });
  }

  @Post("import")
  @Roles("ADMIN_SYSTEM")
  importCsv(@Body() body: { rows: any[] }, @Req() req: Request) {
    return this.users.importCsv(body.rows, (req as any).user?.sub);
  }
}
