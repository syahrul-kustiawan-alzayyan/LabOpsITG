import { BadRequestException, Controller, Post, UseInterceptors, UploadedFile, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { MAX_UPLOAD_BYTES, toUploadResponse, uploadFileFilter, uploadStorage } from "./upload.config";

@Controller("files")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  @Post("upload")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER", "INSTRUKTUR", "ASISTEN_DOSEN")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: uploadStorage,
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: uploadFileFilter,
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException("File tidak ditemukan");
    return toUploadResponse(file);
  }
}
