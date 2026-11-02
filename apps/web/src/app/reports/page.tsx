"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { downloadCsv } from "@/lib/export";

const STATUS_LABEL: Record<string, string> = {
  DIAJUKAN: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
  SELESAI: "Selesai",
  BARU: "Baru",
  DIVERIFIKASI: "Diverifikasi",
  DALAM_PENANGANAN: "Ditangani",
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  TIDAK_HADIR: "Tidak hadir",
  BAIK: "Baik",
  PERLU_PERAWATAN: "Perlu perawatan",
  RUSAK: "Rusak",
  DIHAPUSKAN: "Dihapuskan",
};

function label(key: string) {
  return STATUS_LABEL[key] || key.replaceAll("_", " ").toLowerCase();
}

function Breakdown({ title, data, total }: { title: string; data: Record<string, any>; total: number }) {
  const entries = Object.entries(data || {});
  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
        {entries.length === 0 && <p className="field-hint">Belum ada data.</p>}
        {entries.map(([key, value]) => {
          const n = Number(value) || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 3 }}>
                <span>{label(key)}</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {n} <span style={{ color: "var(--ink-soft)" }}>({pct}%)</span>
                </span>
              </div>
              <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--petrol-600)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [dash, setDash] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [labs, setLabs] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  });
  const [filterLab, setFilterLab] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDash = useCallback(async () => {
    try {
      const [d, l] = await Promise.all([api<any>("/reports/dashboard"), api<any[]>("/labs")]);
      setDash(d);
      setLabs(l);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDash();
  }, [loadDash]);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ weekStart });
    if (filterLab) params.set("labId", filterLab);
    api<any>(`/reports/weekly?${params.toString()}`)
      .then((d) => {
        if (alive) setWeekly(d);
      })
      .catch((e) => {
        if (alive) setMsg(e.message);
      });
    return () => {
      alive = false;
    };
  }, [weekStart, filterLab]);

  const sums = useMemo(() => {
    const sum = (obj: Record<string, any>) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return {
      bookings: sum(dash?.bookings),
      issues: sum(dash?.issues),
      attendance: sum(dash?.attendance),
      inventory: sum(dash?.inventory),
    };
  }, [dash]);

  const attendanceTotal = useMemo(
    () =>
      Object.values((weekly?.attendance || {}) as Record<string, number>).reduce(
        (a: number, b: number) => a + (Number(b) || 0),
        0,
      ),
    [weekly],
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan & Analitik</h1>
          <p className="page-subtitle">Ringkasan operasional laboratorium untuk koordinator dan pimpinan program studi.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              weekly &&
              downloadCsv("laporan-mingguan.csv", [
                { metrik: "Sesi terjadwal", nilai: weekly.sessionsScheduled },
                { metrik: "Sesi dengan absensi", nilai: weekly.sessionsWithAttendance },
                { metrik: "Peminjaman dibatalkan", nilai: weekly.cancelledBookings },
                { metrik: "Kendala baru", nilai: weekly.issuesCreated },
                ...Object.entries(weekly.attendance || {}).map(([k, v]) => ({ metrik: `Absensi ${label(k)}`, nilai: v as any })),
              ])
            }
          >
            <Icon name="report" size={16} /> Ekspor mingguan
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Icon name="report" size={16} /> Cetak
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-danger">{msg}</div>}

      <div className="ops-strip reveal">
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="users" size={14} /> Pengguna aktif
          </span>
          <span className="ops-stat-value">{loading ? "…" : dash?.users ?? 0}</span>
          <span className="ops-stat-note">{dash?.labs ?? 0} lab aktif</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="calendar" size={14} /> Jadwal aktif
          </span>
          <span className="ops-stat-value">{loading ? "…" : dash?.schedules ?? 0}</span>
          <span className="ops-stat-note">sesi semester berjalan</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="clock" size={14} /> Rata-rata penanganan
          </span>
          <span className="ops-stat-value">{loading ? "…" : dash?.avgIssueHandlingHours ?? 0}</span>
          <span className="ops-stat-note">jam per tiket selesai</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="attendance" size={14} /> Catatan absensi
          </span>
          <span className="ops-stat-value">{loading ? "…" : sums.attendance}</span>
          <span className="ops-stat-note">seluruh waktu</span>
        </div>
      </div>

      <section style={{ marginBottom: 18 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Kondisi sistem saat ini</h2>
            <p className="section-note">Distribusi status pada seluruh data aktif.</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <Breakdown title={`Peminjaman (${sums.bookings})`} data={dash?.bookings || {}} total={sums.bookings} />
          <Breakdown title={`Kendala (${sums.issues})`} data={dash?.issues || {}} total={sums.issues} />
          <Breakdown title={`Absensi (${sums.attendance})`} data={dash?.attendance || {}} total={sums.attendance} />
          <Breakdown title={`Inventaris (${sums.inventory})`} data={dash?.inventory || {}} total={sums.inventory} />
        </div>
      </section>

      <div className="card reveal reveal-2">
        <div className="card-head">
          <div>
            <h2 className="card-title">Laporan mingguan praktikum</h2>
            <p className="card-note">Pilih awal minggu dan lab untuk melihat aktivitas pada periode tersebut.</p>
          </div>
          <span className="badge badge-plain">{weekly ? `${weekly.weekStart} — ${weekly.weekEnd}` : "memuat…"}</span>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div className="field" style={{ minWidth: 180 }}>
            <label htmlFor="r-week">Awal minggu</label>
            <input id="r-week" className="input" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="r-lab">Lab</label>
            <select id="r-lab" value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
              <option value="">Semua lab</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.kode} — {l.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Sesi terjadwal</div>
            <div className="stat-value">{weekly?.sessionsScheduled ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sesi dengan absensi</div>
            <div className="stat-value">{weekly?.sessionsWithAttendance ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Peminjaman dibatalkan</div>
            <div className="stat-value">{weekly?.cancelledBookings ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Kendala baru</div>
            <div className="stat-value">{weekly?.issuesCreated ?? 0}</div>
          </div>
        </div>

        <hr className="divider" />

        <h3 className="card-title">Kehadiran pekan ini</h3>
        <p className="card-note" style={{ marginBottom: 10 }}>
          {attendanceTotal} catatan absensi pada periode terpilih.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Jumlah</th>
                <th>Proporsi</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(weekly?.attendance || {}).map(([k, v]: any) => {
                const pct = attendanceTotal ? Math.round((Number(v) / attendanceTotal) * 100) : 0;
                return (
                  <tr key={k}>
                    <td>{label(k)}</td>
                    <td className="num">{v}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: k === "HADIR" || k === "TERLAMBAT" ? "var(--ok)" : "var(--signal)" }} />
                        </div>
                        <span className="num" style={{ fontSize: 13 }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
