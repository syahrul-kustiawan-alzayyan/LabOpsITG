import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

const ALLOWED = new Map<string, string[]>([
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/webp", [".webp"]],
  ["application/pdf", [".pdf"]],
]);

const storage = diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  },
});

/**
 * Unggah berkas untuk pelamar publik (surat lamaran, CV, transkrip).
 * Tanpa guard, tetapi tetap dibatasi tipe berkas dan ukuran.
 */
@Controller("public/files")
export class FilesPublicController {
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const allowedExt = ALLOWED.get(file.mimetype);
        if (!allowedExt || !allowedExt.includes(ext)) {
          return cb(new BadRequestException("Tipe file tidak diizinkan. Gunakan PNG, JPG, WEBP, atau PDF."), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException("File tidak ditemukan");
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
