"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const JENIS_LABEL: Record<string, string> = {
  PEMINJAMAN_BARU: "Peminjaman baru",
  PEMINJAMAN_DISETUJUI: "Peminjaman disetujui",
  PEMINJAMAN_DITOLAK: "Peminjaman ditolak",
  PEMINJAMAN_DIBATALKAN: "Peminjaman dibatalkan",
  PENGINGAT_PEMINJAMAN: "Pengingat peminjaman",
  KENDALA_BARU: "Kendala baru",
  KENDALA_DIVERIFIKASI: "Kendala diverifikasi",
  KENDALA_DITUGASKAN: "Penugasan kendala",
  KENDALA_STATUS: "Status kendala",
  KENDALA_REOPEN: "Kendala dibuka kembali",
  KOREKSI_ABSENSI: "Koreksi absensi",
  LAMARAN_BARU: "Lamaran baru",
  LAMARAN_STATUS: "Status lamaran",
  WAWANCARA_DIJADWALKAN: "Wawancara dijadwalkan",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<any[]>("/notifications"));
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filter === "unread" && n.isRead) return false;
      if (!q) return true;
      return n.isi?.toLowerCase().includes(q) || JENIS_LABEL[n.jenis]?.toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  const unread = items.filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifikasi</h1>
          <p className="page-subtitle">Kabar operasional terbaru: keputusan peminjaman, penugasan kendala, dan status lamaran.</p>
        </div>
        <div className="page-actions">
          {unread > 0 && (
            <button className="btn btn-secondary" onClick={markAll}>
              <Icon name="check" size={16} /> Tandai semua dibaca
            </button>
          )}
          <button className="btn btn-secondary" onClick={load}>
            <Icon name="refresh" size={16} /> Muat ulang
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-danger">{msg}</div>}

      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="chip-row">
            <button type="button" className={`chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
              Semua ({items.length})
            </button>
            <button type="button" className={`chip ${filter === "unread" ? "is-active" : ""}`} onClick={() => setFilter("unread")}>
              Belum dibaca ({unread})
            </button>
          </div>
          <div className="field" style={{ flex: "1 1 240px", maxWidth: 340, marginLeft: "auto" }}>
            <label htmlFor="n-search" style={{ position: "absolute", left: -9999 }}>
              Cari notifikasi
            </label>
            <div style={{ position: "relative" }}>
              <input id="n-search" className="input" placeholder="Cari notifikasi…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              <span style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }}>
                <Icon name="search" size={15} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="popover-list" style={{ maxHeight: "none" }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 38, marginBottom: 10 }} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <Icon name="bell" size={26} />
              <p className="empty-title">{filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi"}</p>
              <p className="empty-text">Kabar terbaru akan muncul di sini dan pada lonceng di bilah atas.</p>
            </div>
          ) : (
            visible.map((n) => {
              const hint = JENIS_LABEL[n.jenis] || n.jenis?.replaceAll("_", " ").toLowerCase();
              return (
                <div key={n.id} className={`notif ${n.isRead ? "" : "is-unread"}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "default" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: n.isRead ? "var(--surface-2)" : "var(--signal-050)",
                      color: n.isRead ? "var(--ink-soft)" : "var(--signal)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Icon name={n.isRead ? "bell" : "alert"} size={14} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>{n.isi}</div>
                    <div className="notif-meta">
                      <span>{hint}</span>
                      <span>{new Date(n.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  {!n.isRead && (
                    <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)}>
                      Tandai dibaca
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="popover-foot">
          <span>{unread} belum dibaca dari {items.length} notifikasi</span>
          <Link href="/dashboard">Kembali ke dasbor</Link>
        </div>
      </div>
    </>
  );
}
