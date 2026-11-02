"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dasbor", icon: "*", roles: null },
  { href: "/users", label: "Pengguna", icon: "*", roles: ["ADMIN_SYSTEM"] },
  { href: "/labs", label: "Lab", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR"] },
  { href: "/schedules", label: "Jadwal", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
  { href: "/bookings", label: "Peminjaman", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
  { href: "/issues", label: "Kendala", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
  { href: "/inventory", label: "Inventaris", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
  { href: "/attendance", label: "Absensi", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
  { href: "/reports", label: "Laporan", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "LEADER"] },
  { href: "/prodi", label: "Prodi", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "LEADER"] },
  { href: "/recruitment", label: "Rekrutmen", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
  { href: "/staff", label: "Instruktur/Asisten", icon: "*", roles: ["ADMIN_SYSTEM", "COORDINATOR", "USER", "LEADER"] },
];

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("http://localhost:4000/auth/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("unauth");
        const d = await r.json();
        setUser(d.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  const isAuthPage = pathname === "/login" || pathname === "/";

  async function logout() {
    await fetch("http://localhost:4000/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  const allowedNav = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">L</div>
          <div>
            <div className="title">LabOps</div>
            <div className="subtitle">Ilkom ITG</div>
          </div>
        </div>
        <div className="sidebar-section">Menu</div>
        {allowedNav.map((n) => (
          <a key={n.href} href={n.href} className={`sidebar-link ${pathname === n.href ? "active" : ""}`}>
            <span className="icon">{n.icon}</span>
            {n.label}
          </a>
        ))}
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{NAV.find((n) => n.href === pathname)?.label || "LabOps"}</div>
          <div className="topbar-user">
            {loaded && user ? (
              <>
                <span>{user.email}</span>
                <span className="badge badge-info">{user.role}</span>
                <button className="btn btn-ghost btn-sm" onClick={logout}>Keluar</button>
              </>
            ) : loaded ? (
              <a href="/login" className="btn btn-primary btn-sm">Masuk</a>
            ) : null}
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
