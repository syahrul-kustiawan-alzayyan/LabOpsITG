import { Body, Controller, Post, Req, Res, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Response, Request } from "express";
import { JwtService } from "@nestjs/jwt";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) {}

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    res.cookie("access_token", result.accessToken, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 15 * 60 * 1000 });
    res.cookie("refresh_token", result.refreshToken, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/auth/refresh" });
    return { user: result.user };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = req.cookies?.refresh_token;
    if (!rt) throw new (require("@nestjs/common").UnauthorizedException)("No refresh token");
    let payload: any;
    try { payload = this.jwt.verify(rt, { secret: process.env.JWT_REFRESH_SECRET }); } catch { throw new (require("@nestjs/common").UnauthorizedException)("Invalid refresh"); }
    const accessToken = this.jwt.sign({ sub: payload.sub, email: payload.email, role: payload.role, subRoles: payload.subRoles }, { expiresIn: "15m" });
    res.cookie("access_token", accessToken, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 15 * 60 * 1000 });
    return { ok: true };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token", { path: "/auth/refresh" });
    return { ok: true };
  }

  @Get("me")
  me(@Req() req: Request) {
    const token = req.cookies?.access_token;
    if (!token) throw new (require("@nestjs/common").UnauthorizedException)("Not authenticated");
    try {
      const payload = this.jwt.verify(token);
      return { user: payload };
    } catch {
      throw new (require("@nestjs/common").UnauthorizedException)("Invalid token");
    }
  }
}
