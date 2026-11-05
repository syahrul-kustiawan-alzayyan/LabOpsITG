"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon, IconName } from "./Icon";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  roles: string[] | null;
  group: string;
  /** Grup khusus saat pengguna berperan koordinator, agar menu utamanya mengelompok. */
  coordGroup?: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dasbor", icon: "dashboard", roles: ["ADMIN_SYSTEM", "USER", "LEADER"], group: "Operasional" },
  { href: "/koordinator", label: "Dasbor Koordinator", icon: "dashboard", roles: ["ADMIN_SYSTEM", "COORDINATOR"], group: "Operasional" },
  { href: "/schedules", label: "Jadwal", icon: "calendar", roles: null, group: "Operasional", coordGroup: "Menu Koordinator" },
  { href: "/bookings", label: "Peminjaman", icon: "booking", roles: null, group: "Operasional", coordGroup: "Menu Koordinator" },
  { href: "/issues", label: "Kendala", icon: "issue", roles: null, group: "Operasional", coordGroup: "Menu Koordinator" },
  { href: "/attendance", label: "Absensi", icon: "attendance", roles: ["ADMIN_SYSTEM", "USER", "LEADER"], group: "Operasional" },
  { href: "/attendance/admin", label: "Admin Absensi", icon: "attendance", roles: ["ADMIN_SYSTEM", "LEADER"], group: "Manajemen" },
  { href: "/courses", label: "Mata Kuliah", icon: "book", roles: ["ADMIN_SYSTEM", "COORDINATOR"], group: "Manajemen", coordGroup: "Menu Koordinator" },
  { href: "/labs", label: "Lab", icon: "lab", roles: ["ADMIN_SYSTEM"], group: "Manajemen" },
  { href: "/inventory", label: "Inventaris", icon: "inventory", roles: null, group: "Manajemen", coordGroup: "Menu Koordinator" },
  { href: "/staff", label: "Instruktur & Asisten", icon: "staff", roles: null, group: "Manajemen" },
  { href: "/recruitment", label: "Rekrutmen", icon: "recruitment", roles: null, group: "Manajemen", coordGroup: "Menu Koordinator" },
  { href: "/reports", label: "Laporan", icon: "report", roles: ["ADMIN_SYSTEM", "LEADER"], group: "Wawasan" },
  { href: "/prodi", label: "Prodi", icon: "prodi", roles: ["ADMIN_SYSTEM", "LEADER"], group: "Wawasan" },
  { href: "/audit", label: "Jejak Audit", icon: "shield", roles: ["ADMIN_SYSTEM"], group: "Wawasan" },
  { href: "/users", label: "Pengguna", icon: "users", roles: ["ADMIN_SYSTEM"], group: "Wawasan" },
];

const MOBILE = ["/dashboard", "/schedules", "/bookings", "/issues", "/attendance"];

const ROLE_LABEL: Record<string, string> = {
  ADMIN_SYSTEM: "Admin sistem",
  COORDINATOR: "Koordinator lab",
  LEADER: "Pimpinan",
  USER: "Pengguna",
};

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [today, setToday] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  const isPublic =
    pathname === "/login" || pathname === "/" || pathname.startsWith("/informasi");

  useEffect(() => {
    setOpen(window.localStorage.getItem("labops.rail") === "open");
    setToday(
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ user: any }>("/auth/me")
      .then((d) => {
        if (!cancelled) setUser(d.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true);
          setCheckedPath(pathname);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const loadNotifications = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        api<any[]>("/notifications"),
        api<number>("/notifications/unread-count"),
      ]);
      setNotifications(list);
      setUnread(count);
    } catch {
      /* diamkan, notifikasi bukan alur kritis */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const id = setInterval(loadNotifications, 60_000);
    return () => clearInterval(id);
  }, [user, loadNotifications]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [notifOpen]);

  useEffect(() => {
    // Tunggu hasil /auth/me untuk path ini agar tidak memakai status pengguna
    // dari halaman sebelumnya (mis. setelah login dari /login).
    if (checkedPath !== pathname) return;
    if (!user && !isPublic) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [checkedPath, pathname, user, isPublic, router]);

  function toggleRail() {
    const next = !open;
    setOpen(next);
    window.localStorage.setItem("labops.rail", next ? "open" : "closed");
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* tetap arahkan ke login */
    }
    router.push("/login");
  }

  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* abaikan */
    }
  }

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      /* abaikan */
    }
  }

  if (isPublic) return <>{children}</>;

  const role = user?.role;
  // Koordinator terbatas hanya pada 6 menu utama + dasbor koordinator itu sendiri.
  const allowed = role === "COORDINATOR"
    ? NAV.filter((n) => n.href === "/koordinator" || n.coordGroup === "Menu Koordinator")
    : NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
  const groupOf = (n: NavItem) => (role === "COORDINATOR" && n.coordGroup ? n.coordGroup : n.group);
  const groups = Array.from(new Set(allowed.map(groupOf)));
  const current = NAV.find((n) => n.href === pathname);
  const homeHref = role === "COORDINATOR" ? "/koordinator" : "/dashboard";
  const mobileHrefs =
    role === "COORDINATOR"
      ? ["/koordinator", "/schedules", "/bookings", "/issues", "/inventory", "/recruitment"]
      : MOBILE;
  // Jika beberapa menu berbagi prefix (mis. /attendance dan /attendance/admin),
  // hanya menu dengan prefix terpanjang yang ditandai aktif.
  const activeHref = allowed
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="app-shell">
      <aside className={`rail ${open ? "is-open" : ""}`} aria-label="Navigasi utama">
        <Link href={homeHref} className="rail-brand" style={{ textDecoration: "none" }}>
          <span className="rail-mark" aria-hidden="true">
            L
          </span>
          <span className="rail-brand-text">
            <span className="rail-brand-name">LabOps</span>
            <span className="rail-brand-sub">Ilkom ITG</span>
          </span>
        </Link>

        <nav className="rail-nav">
          {groups.map((group) => (
            <div key={group}>
              <div className="rail-section">{group}</div>
              {allowed
                .filter((n) => groupOf(n) === group)
                .map((n) => {
                  const active = n.href === activeHref;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`rail-link ${active ? "active" : ""}`}
                      title={n.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon name={n.icon} size={18} />
                      <span className="rail-label">{n.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="rail-divider" aria-hidden="true" />
          <button className="rail-toggle" onClick={toggleRail} aria-label={open ? "Sempitkan navigasi" : "Lebarkan navigasi"}>
            <Icon name="chevron" size={16} />
            {open && <span>Sempitkan</span>}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-title">{current?.label || "LabOps"}</span>
            {today && <span className="topbar-date">{today}</span>}
          </div>

          <div className="topbar-actions">
            {user && (
              <div className="popover-wrap" ref={popRef}>
                <button
                  className="icon-btn"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    if (!notifOpen) loadNotifications();
                  }}
                  aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
                  aria-expanded={notifOpen}
                >
                  <Icon name="bell" size={19} />
                  {unread > 0 && <span className="dot" />}
                </button>
                {notifOpen && (
                  <div className="popover" role="dialog" aria-label="Notifikasi">
                    <div className="popover-head">
                      <span className="popover-title">Notifikasi</span>
                      {unread > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={markAll}>
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    <div className="popover-list">
                      {notifications.length === 0 ? (
                        <div className="empty" style={{ padding: 24 }}>
                          <Icon name="bell" size={20} />
                          <p className="empty-title">Belum ada notifikasi</p>
                          <p className="empty-text">Kabar terbaru akan muncul di sini.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            className={`notif ${n.isRead ? "" : "is-unread"}`}
                            onClick={() => markRead(n.id)}
                          >
                            {n.isi}
                            <span className="notif-meta">
                              <span>{n.jenis?.replaceAll("_", " ").toLowerCase()}</span>
                              <span>{new Date(n.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="popover-foot">
                      <span>{unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}</span>
                      <Link href="/notifications" onClick={() => setNotifOpen(false)}>
                        Lihat semua
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loaded && user ? (
              <div className="topbar-user">
                <div className="user-meta">
                  <span className="user-name">{user.nama || user.email}</span>
                  <span className="user-role">{ROLE_LABEL[user.role] || user.role}</span>
                </div>
                <span className="avatar" aria-hidden="true">
                  {initials(user.nama)}
                </span>
                <button className="icon-btn" onClick={logout} aria-label="Keluar" title="Keluar">
                  <Icon name="logout" size={18} />
                </button>
              </div>
            ) : loaded ? (
              <Link href="/login" className="btn btn-sm">
                Masuk
              </Link>
            ) : null}
          </div>
        </header>

        <main id="konten" className="content">
          {children}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Navigasi seluler">
        {allowed
          .filter((n) => mobileHrefs.includes(n.href))
          .map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} className={`mobile-link ${active ? "active" : ""}`}>
                <Icon name={n.icon} size={19} />
                {n.label}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
