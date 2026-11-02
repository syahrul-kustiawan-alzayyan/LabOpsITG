import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

const storage = diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@Controller("files")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  @Post("upload")
  @Roles("ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER")
  @UseInterceptors(FileInterceptor("file", { storage, limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@UploadedFile() file: any) {
    if (!file) return { error: "No file" };
    return { url: `/uploads/${file.filename}`, filename: file.filename, originalname: file.originalname, size: file.size };
  }
}
