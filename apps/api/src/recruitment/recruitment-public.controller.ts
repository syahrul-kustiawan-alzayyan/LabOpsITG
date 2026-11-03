import { Body, Controller, Get, Post } from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service";

/**
 * Endpoint publik untuk halaman informasi.
 * Tidak memakai guard: periode yang dibuka memang ditujukan untuk umum.
 */
@Controller("public/recruitment")
export class RecruitmentPublicController {
  constructor(private svc: RecruitmentService) {}

  @Get("periods")
  periods() {
    return this.svc.findOpenPeriods();
  }

  @Post("applications")
  apply(@Body() body: any) {
    return this.svc.applyPublic(body);
  }
}
