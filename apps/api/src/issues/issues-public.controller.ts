import { Body, Controller, Post } from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { CreatePublicIssueDto } from "./dto/public-issue.dto";

/**
 * Endpoint publik untuk halaman informasi.
 * Tidak memakai guard: pelaporan kendala dapat dilakukan tanpa akun.
 */
@Controller("public/issues")
export class IssuesPublicController {
  constructor(private svc: IssuesService) {}

  @Post()
  create(@Body() body: CreatePublicIssueDto) {
    return this.svc.createPublic(body);
  }
}
