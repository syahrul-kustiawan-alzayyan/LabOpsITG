import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: "15m" } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
