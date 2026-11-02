"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const ACTION_LABEL: Record<string, string> = {
  CREATE_BOOKING: "Buat peminjaman",
  APPROVE_BOOKING: "Setujui peminjaman",
  REJECT_BOOKING: "Tolak peminjaman",
  CANCEL_BOOKING: "Batalkan peminjaman",
  COMPLETE_BOOKING: "Selesaikan peminjaman",
  CREATE_ISSUE: "Buat tiket kendala",
  VERIFY_ISSUE: "Verifikasi kendala",
  UPDATE_ISSUE_STATUS: "Ubah status kendala",
  REOPEN_ISSUE: "Buka kembali kendala",
  SCAN_ATTENDANCE: "Absensi QR",
  MANUAL_ATTENDANCE: "Absensi manual",
  CORRECT_ATTENDANCE: "Koreksi absensi",
  CREATE_SESSION_QR: "Buat QR sesi",
  ENROLL_STUDENT: "Tambah peserta",
  UNENROLL_STUDENT: "Keluarkan peserta",
  CREATE_USER: "Buat pengguna",
  UPDATE_USER: "Ubah pengguna",
  DEACTIVATE_USER: "Nonaktifkan pengguna",
  RESET_PASSWORD: "Reset kata sandi",
  CREATE_LAB: "Buat lab",
  UPDATE_LAB: "Ubah lab",
  DELETE_LAB: "Nonaktifkan lab",
  REGENERATE_QR: "Buat ulang QR lab",
  CREATE_INVENTORY: "Tambah aset",
  UPDATE_INVENTORY: "Ubah aset",
  DELETE_INVENTORY: "Hapus aset",
  MUTATE_INVENTORY: "Mutasi aset",
  CREATE_RECRUITMENT_PERIOD: "Buka periode rekrutmen",
  UPDATE_RECRUITMENT_PERIOD: "Ubah periode rekrutmen",
  APPLY_RECRUITMENT: "Kirim lamaran",
  UPDATE_APPLICATION_STATUS: "Ubah status lamaran",
};

const OBJECT_LABEL: Record<string, string> = {
  Booking: "Peminjaman",
  Issue: "Kendala",
  Attendance: "Absensi",
  Schedule: "Jadwal",
  ClassEnrollment: "Peserta kelas",
  User: "Pengguna",
  Lab: "Lab",
  InventoryItem: "Inventaris",
  RecruitmentPeriod: "Periode rekrutmen",
  Application: "Lamaran",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterObject, setFilterObject] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await api<any[]>("/audit-logs"));
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const objects = useMemo(() => Array.from(new Set(logs.map((l) => l.objectType))).sort(), [logs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (filterObject && l.objectType !== filterObject) return false;
      if (!q) return true;
      return (
        l.actor?.nama?.toLowerCase().includes(q) ||
        l.actor?.email?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        ACTION_LABEL[l.action]?.toLowerCase().includes(q) ||
        l.objectId?.toLowerCase().includes(q)
      );
    });
  }, [logs, search, filterObject]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Jejak Audit</h1>
          <p className="page-subtitle">Catatan 100 aktivitas terakhir: siapa melakukan apa, pada objek mana, dan kapan.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={load}>
            <Icon name="refresh" size={16} /> Muat ulang
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-danger">{msg}</div>}

      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 260px", minWidth: 200 }}>
            <label htmlFor="a-search">Cari</label>
            <div style={{ position: "relative" }}>
              <input id="a-search" className="input" placeholder="Nama pelaku, aksi, atau ID objek…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              <span style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }}>
                <Icon name="search" size={15} />
              </span>
            </div>
          </div>
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="a-object">Jenis objek</label>
            <select id="a-object" value={filterObject} onChange={(e) => setFilterObject(e.target.value)}>
              <option value="">Semua objek</option>
              {objects.map((o) => (
                <option key={o} value={o}>
                  {OBJECT_LABEL[o] || o}
                </option>
              ))}
            </select>
          </div>
          <span className="badge badge-plain" style={{ marginBottom: 8 }}>
            {visible.length} catatan
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Pelaku</th>
              <th>Aksi</th>
              <th>Objek</th>
              <th>ID objek</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="skeleton" style={{ height: 32 }} />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <Icon name="shield" size={24} />
                    <p className="empty-title">Belum ada catatan audit</p>
                    <p className="empty-text">Aktivitas pengguna akan tercatat otomatis di sini.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((l) => {
                const open = openId === l.id;
                const hasDetail = l.oldValue || l.newValue;
                return (
                  <Fragment key={l.id}>
                    <tr>
                      <td className="num" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                        {new Date(l.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{l.actor?.nama || "Sistem"}</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{l.actor?.email || "—"}</div>
                      </td>
                      <td>
                        <span className="badge badge-plain">{ACTION_LABEL[l.action] || l.action}</span>
                      </td>
                      <td>{OBJECT_LABEL[l.objectType] || l.objectType}</td>
                      <td className="num" style={{ fontSize: 12 }}>
                        {l.objectId?.slice(0, 12)}…
                      </td>
                      <td>
                        {hasDetail && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(open ? null : l.id)} aria-expanded={open}>
                            {open ? "Tutup" : "Detail"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {open && hasDetail && (
                      <tr key={`${l.id}-detail`}>
                        <td colSpan={6} style={{ background: "#fbfcfa" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                            <div>
                              <div className="stat-label" style={{ marginBottom: 4 }}>
                                Nilai sebelumnya
                              </div>
                              <pre style={{ margin: 0, fontSize: 12, background: "var(--surface-2)", padding: 8, borderRadius: 5, maxHeight: 180, overflow: "auto" }}>
                                {l.oldValue ? JSON.stringify(l.oldValue, null, 2) : "—"}
                              </pre>
                            </div>
                            <div>
                              <div className="stat-label" style={{ marginBottom: 4 }}>
                                Nilai sesudahnya
                              </div>
                              <pre style={{ margin: 0, fontSize: 12, background: "var(--surface-2)", padding: 8, borderRadius: 5, maxHeight: 180, overflow: "auto" }}>
                                {l.newValue ? JSON.stringify(l.newValue, null, 2) : "—"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
