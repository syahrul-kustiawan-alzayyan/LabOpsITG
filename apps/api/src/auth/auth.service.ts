import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

export interface SessionUser {
  id: string;
  nama: string;
  email: string;
  role: string;
  subRoles: string[];
  prodiId?: string;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private toSessionUser(user: { id: string; nama: string; email: string; role: string; subRoles: string[]; prodiId?: string }): SessionUser {
    return { id: user.id, nama: user.nama, email: user.email, role: user.role, subRoles: user.subRoles, prodiId: user.prodiId };
  }

  async validateUser(email: string, password: string) {
    const identifier = (email || "").trim().toLowerCase();
    // Terima juga username pendek (mis. "instruktur01") tanpa domain email.
    const emailAddress = identifier.includes("@") ? identifier : `${identifier}@labops.local`;
    const user = await this.prisma.user.findUnique({ where: { email: emailAddress }, select: { id: true, nama: true, email: true, passwordHash: true, role: true, subRoles: true, prodiId: true, status: true, deletedAt: true } });
    if (!user || user.deletedAt || user.status !== "ACTIVE") throw new UnauthorizedException("Email atau kata sandi salah");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Email atau kata sandi salah");
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, email: user.email, role: user.role, subRoles: user.subRoles, nama: user.nama, prodiId: user.prodiId };
    const accessToken = this.jwt.sign(payload, { expiresIn: "15m" });
    const refreshToken = this.jwt.sign(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: "7d" });
    return { accessToken, refreshToken, user: this.toSessionUser(user) };
  }

  /** Data pengguna selalu diambil dari database, bukan dari klaim token. */
  async me(userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nama: true, email: true, role: true, subRoles: true, prodiId: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.status !== "ACTIVE") throw new UnauthorizedException("Akun tidak aktif");
    return this.toSessionUser(user);
  }

  async refreshUser(userId: string) {
    const user = await this.me(userId);
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, subRoles: user.subRoles, nama: user.nama, prodiId: user.prodiId },
      { expiresIn: "15m" },
    );
  }
}
