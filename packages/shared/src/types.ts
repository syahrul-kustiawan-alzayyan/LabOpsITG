export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  subRoles: string[];
}
