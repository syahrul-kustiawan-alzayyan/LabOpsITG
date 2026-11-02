import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || user.status !== "ACTIVE") throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, email: user.email, role: user.role, subRoles: user.subRoles };
    const accessToken = this.jwt.sign(payload, { expiresIn: "15m" });
    const refreshToken = this.jwt.sign(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: "7d" });
    return { accessToken, refreshToken, user: { id: user.id, nama: user.nama, email: user.email, role: user.role, subRoles: user.subRoles } };
  }
}
