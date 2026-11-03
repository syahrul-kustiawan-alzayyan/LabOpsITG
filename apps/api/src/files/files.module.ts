import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesPublicController } from "./files-public.controller";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [AuthModule], controllers: [FilesController, FilesPublicController], providers: [RolesGuard] })
export class FilesModule {}
