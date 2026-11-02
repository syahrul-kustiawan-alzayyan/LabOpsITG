"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:4000/auth/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Belum masuk");
        const data = await r.json();
        setUser(data.user);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
        <p className="alert alert-danger">{error} - <a href="/login">Masuk</a></p>
      </div>
    );
  }

  const links = [
    { href: "/users", label: "Pengguna", show: user?.role === "ADMIN_SYSTEM" },
    { href: "/labs", label: "Lab", show: user?.role === "ADMIN_SYSTEM" || user?.role === "COORDINATOR" },
    { href: "/schedules", label: "Jadwal", show: true },
    { href: "/bookings", label: "Peminjaman", show: true },
    { href: "/issues", label: "Kendala", show: true },
    { href: "/inventory", label: "Inventaris", show: true },
    { href: "/attendance", label: "Absensi", show: true },
    { href: "/reports", label: "Laporan", show: user?.role === "ADMIN_SYSTEM" || user?.role === "COORDINATOR" || user?.role === "LEADER" },
    { href: "/prodi", label: "Prodi", show: user?.role === "ADMIN_SYSTEM" || user?.role === "COORDINATOR" || user?.role === "LEADER" },
    { href: "/recruitment", label: "Rekrutmen", show: true },
    { href: "/staff", label: "Instruktur/Asisten", show: true },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dasbor</h1>
          <p className="page-subtitle">Ringkasan operasional laboratorium</p>
        </div>
      </div>

      {user && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ margin: 0 }}>Selamat datang, <strong>{user.email}</strong></p>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Peran: <span className="badge badge-info">{user.role}</span> {user.subRoles?.length ? user.subRoles.join(", ") : ""}
          </p>
        </div>
      )}

      <div className="stat-grid">
        {links.filter((l) => l.show).map((l) => (
          <a key={l.href} href={l.href} className="stat-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{l.label}</div>
          </a>
        ))}
      </div>
    </>
  );
}
