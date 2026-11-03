"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const LINKS = [
  { href: "/informasi/jadwal", label: "Jadwal Lab" },
  { href: "/informasi/peminjaman", label: "Peminjaman" },
  { href: "/informasi/kendala", label: "Kendala" },
  { href: "/informasi/rekrutmen", label: "Rekrutmen" },
];

/**
 * Kerangka halaman publik: navigasi informasi laboratorium dan footer.
 * Dipakai oleh halaman awal dan halaman informasi khusus.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api<{ user: any }>("/auth/me", {}, false)
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand-inline">
          <span className="rail-mark">L</span>
          <span>
            <span className="brand-name">LabOps</span>
            <span className="brand-sub">Ilkom ITG</span>
          </span>
        </Link>
        <div className="landing-nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`landing-nav-link ${pathname === link.href ? "is-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          {me ? (
            <Link href="/dashboard" className="btn btn-sm">
              Buka dasbor
            </Link>
          ) : (
            <Link href="/login" className="btn btn-sm">
              Masuk
            </Link>
          )}
        </div>
      </nav>

      <main id="konten">{children}</main>

      <footer className="landing-foot">
        <div className="landing-foot-inner">
          <span>© 2026 Laboratorium Ilmu Komputer · Institut Teknologi Garut</span>
          <span>LabOps · sistem operasional laboratorium</span>
        </div>
      </footer>
    </div>
  );
}
