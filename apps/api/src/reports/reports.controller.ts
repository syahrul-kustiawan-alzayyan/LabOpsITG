import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get("today")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  today(@Query() q: any) { return this.svc.today(q.periodeId); }

  @Get("dashboard")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  dashboard(@Query() q: any) { return this.svc.dashboard(q.periodeId); }

  @Get("weekly")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  weekly(@Query() q: any) { return this.svc.weekly(q.weekStart, q.labId, q.mataKuliah, q.periodeId); }

  @Get("usage")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "LEADER")
  usage(@Query() q: any) { return this.svc.usage(q.from, q.to, q.labId, q.periodeId); }
}
