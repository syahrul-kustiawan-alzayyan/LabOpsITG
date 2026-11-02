import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";

@Module({ imports: [AuthModule], controllers: [FilesController], providers: [RolesGuard] })
export class FilesModule {}
