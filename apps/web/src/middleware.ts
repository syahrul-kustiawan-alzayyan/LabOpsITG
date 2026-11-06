import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/manifest.webmanifest", "/favicon.ico", "/icon.svg", "/apple-icon.png"];

const ROLE_RULES: { prefix: string; roles: string[] }[] = [
  { prefix: "/koordinator", roles: ["ADMIN_SYSTEM", "COORDINATOR"] },
  { prefix: "/courses", roles: ["ADMIN_SYSTEM", "COORDINATOR"] },
  { prefix: "/attendance/admin", roles: ["ADMIN_SYSTEM", "LEADER"] },
  { prefix: "/attendance", roles: ["ADMIN_SYSTEM", "USER", "INSTRUKTUR", "ASISTEN_DOSEN"] },
  { prefix: "/instruktur/matakuliah", roles: ["INSTRUKTUR", "ASISTEN_DOSEN", "USER"] },
  { prefix: "/instruktur", roles: ["INSTRUKTUR", "ASISTEN_DOSEN"] },
  { prefix: "/staff", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "INSTRUKTUR", "ASISTEN_DOSEN", "LEADER"] },
  { prefix: "/users", roles: ["ADMIN_SYSTEM"] },
  { prefix: "/audit", roles: ["ADMIN_SYSTEM"] },
  { prefix: "/labs", roles: ["ADMIN_SYSTEM"] },
  { prefix: "/reports", roles: ["ADMIN_SYSTEM", "LEADER"] },
  { prefix: "/prodi", roles: ["ADMIN_SYSTEM", "LEADER"] },
];

function decodeRole(token?: string): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json).role || null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/informasi") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  ) {
    return NextResponse.next();
  }

  const access = req.cookies.get("access_token")?.value;
  const refresh = req.cookies.get("refresh_token")?.value;
  if (!access && !refresh) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = decodeRole(access);
  if (role) {
    const rule = ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
    if (rule && !rule.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("denied", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
