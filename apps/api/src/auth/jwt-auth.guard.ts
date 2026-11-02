import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Verifikasi JWT + cek ulang status pengguna ke database.
 * Dengan begitu akun yang dinonaktifkan langsung kehilangan akses,
 * dan perubahan peran berlaku tanpa menunggu token kedaluwarsa.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException("Silakan masuk terlebih dahulu");

    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("Sesi kedaluwarsa, silakan masuk kembali");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, nama: true, email: true, role: true, subRoles: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Akun tidak aktif");
    }

    (req as any).user = {
      sub: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      subRoles: user.subRoles,
    };
    return true;
  }
}
