import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MAX_UPLOAD_BYTES, toUploadResponse, uploadFileFilter, uploadStorage } from "./upload.config";

/**
 * Endpoint publik untuk pelamar (surat lamaran, CV, transkrip).
 * Tanpa guard, tetapi tetap dibatasi tipe berkas dan ukuran.
 */
@Controller("public/files")
export class FilesPublicController {
  @Post("upload")
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
