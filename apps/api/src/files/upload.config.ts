import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";
import { extname } from "path";

/**
 * Konfigurasi unggahan berkas bersama untuk endpoint internal dan publik.
 *
 * Whitelist memetakan MIME ke ekstensi yang diizinkan, sehingga tipe
 * menyamar (mis. `.pdf` dengan MIME `image/png`) tetap ditolak karena kedua
 * sisi harus cocok.
 */
const ALLOWED = new Map<string, string[]>([
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/webp", [".webp"]],
  ["application/pdf", [".pdf"]],
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const uploadStorage = diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  },
});

/** Filter multer: hanya tipe MIME + ekstensi yang terdaftar boleh lewat. */
export function uploadFileFilter(
  req: any,
  file: any,
  cb: (error: Error | null, acceptFile?: boolean) => void,
) {
  const ext = extname(file.originalname).toLowerCase();
  const allowedExt = ALLOWED.get(file.mimetype);
  if (!allowedExt || !allowedExt.includes(ext)) {
    return cb(
      new BadRequestException("Tipe file tidak diizinkan. Gunakan PNG, JPG, WEBP, atau PDF."),
      false,
    );
  }
  cb(null, true);
}

/** Bentuk respons yang dipakai kedua controller unggah. */
export function toUploadResponse(file: any) {
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
}
