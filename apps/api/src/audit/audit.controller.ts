import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private audit: AuditService) {}
  @Get()
  @Roles("ADMIN_SYSTEM", "COORDINATOR")
  findAll() { return this.audit.findAll(); }
}
