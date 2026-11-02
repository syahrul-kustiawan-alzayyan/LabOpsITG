import { Body, Controller, HttpCode, HttpException, Post, Req, Res, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Response, Request } from "express";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Attempt = { count: number; first: number };
const attempts = new Map<string, Attempt>();

function cookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return { httpOnly: true, sameSite: "lax" as const, secure };
}

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) {}

  private guardAttempts(key: string) {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now - entry.first > WINDOW_MS) {
      attempts.set(key, { count: 1, first: now });
      return;
    }
    entry.count += 1;
    if (entry.count > MAX_ATTEMPTS) {
      throw new HttpException("Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.", 429);
    }
  }

  private clearAttempts(key: string) {
    attempts.delete(key);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const key = `${req.ip || "unknown"}|${dto.email.toLowerCase()}`;
    this.guardAttempts(key);
    let result: Awaited<ReturnType<AuthService["login"]>>;
    try {
      result = await this.auth.login(dto.email, dto.password);
    } catch (err) {
      throw err;
    }
    this.clearAttempts(key);
    res.cookie("access_token", result.accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });
    res.cookie("refresh_token", result.refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000, path: "/auth/refresh" });
    return { user: result.user };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = req.cookies?.refresh_token;
    if (!rt) throw new HttpException("Sesi tidak ditemukan", 401);
    let payload: any;
    try {
      payload = this.jwt.verify(rt, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new HttpException("Sesi kedaluwarsa", 401);
    }
    const accessToken = await this.auth.refreshUser(payload.sub);
    res.cookie("access_token", accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });
    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    const base = cookieOptions();
    res.clearCookie("access_token", base);
    res.clearCookie("refresh_token", { ...base, path: "/auth/refresh" });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    return { user: await this.auth.me((req as any).user.sub) };
  }
}
