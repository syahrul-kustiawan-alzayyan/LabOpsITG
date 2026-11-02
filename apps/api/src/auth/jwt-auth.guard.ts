import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException("Not authenticated");
    try {
      const payload = this.jwt.verify(token);
      (req as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
