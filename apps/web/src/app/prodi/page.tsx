"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const STATUS_LABEL: Record<string, string> = {
  BARU: "Baru",
  DIVERIFIKASI: "Diverifikasi",
  DALAM_PENANGANAN: "Ditangani",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

export default function ProdiPage() {
  const [dash, setDash] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [labs, setLabs] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t, l, i, a] = await Promise.all([
        api<any>("/reports/dashboard"),
        api<any>("/reports/today"),
        api<any[]>("/labs"),
        api<any[]>("/issues"),
        api<any[]>("/attendance").catch(() => []),
      ]);
      setDash(d);
      setToday(t);
      setLabs(l);
      setIssues(i);
      setAttendance(a);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    api<any>(`/reports/weekly?weekStart=${weekStart}`)
      .then((d) => {
        if (alive) setWeekly(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [weekStart]);

  const openIssues = issues.filter((i) => !["SELESAI", "DITOLAK"].includes(i.status));
  const overdueIssues = openIssues.filter((i) => i.dueAt && new Date(i.dueAt) < new Date(new Date().toDateString()));

  const attByLab = useMemo(() => {
    const map: Record<string, { total: number; hadir: number }> = {};
    for (const a of attendance) {
      const kode = a.lab?.kode || "—";
      if (!map[kode]) map[kode] = { total: 0, hadir: 0 };
      map[kode].total += 1;
      if (a.status === "HADIR" || a.status === "TERLAMBAT") map[kode].hadir += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [attendance]);

  const issueByLab = useMemo(() => {
    const map: Record<string, { open: number; total: number }> = {};
    for (const i of issues) {
      const kode = i.lab?.kode || "—";
      if (!map[kode]) map[kode] = { open: 0, total: 0 };
      map[kode].total += 1;
      if (!["SELESAI", "DITOLAK"].includes(i.status)) map[kode].open += 1;
    }
    return map;
  }, [issues]);

  const attendanceTotal = attendance.length;
  const attendanceHadir = attendance.filter((a) => a.status === "HADIR" || a.status === "TERLAMBAT").length;
  const attendanceRate = attendanceTotal ? Math.round((attendanceHadir / attendanceTotal) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dasbor Prodi</h1>
          <p className="page-subtitle">Pandangan pimpinan atas pemanfaatan lab, kehadiran praktikum, dan kendala yang terbuka.</p>
        </div>
        <div className="page-actions">
          <Link href="/reports" className="btn btn-secondary">
            <Icon name="report" size={16} /> Laporan lengkap
          </Link>
          <Link href="/schedules" className="btn btn-secondary">
            <Icon name="calendar" size={16} /> Jadwal lab
          </Link>
        </div>
      </div>

      {msg && <div className="alert alert-danger">{msg}</div>}

      <div className="ops-strip reveal">
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="calendar" size={14} /> Sesi hari ini
          </span>
          <span className="ops-stat-value">{loading ? "…" : today?.sessionsToday ?? 0}</span>
          <span className="ops-stat-note">{HARI[new Date().getDay()]} · {today?.labsActive ?? 0} lab aktif</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="attendance" size={14} /> Tingkat kehadiran
          </span>
          <span className="ops-stat-value">{loading ? "…" : attendanceRate}%</span>
          <span className="ops-stat-note">{attendanceHadir} dari {attendanceTotal} catatan</span>
        </div>
        <div className={`ops-stat ${openIssues.length ? "is-alert" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="issue" size={14} /> Kendala terbuka
          </span>
          <span className="ops-stat-value">{loading ? "…" : openIssues.length}</span>
          <span className="ops-stat-note">{overdueIssues.length} melewati tenggat</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="clock" size={14} /> Rata-rata penanganan
          </span>
          <span className="ops-stat-value">{loading ? "…" : dash?.avgIssueHandlingHours ?? 0}</span>
          <span className="ops-stat-note">jam per tiket selesai</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <div className="card reveal reveal-2">
          <div className="card-head">
            <div>
              <h2 className="card-title">Pemanfaatan lab</h2>
              <p className="card-note">Kehadiran tercatat dan kendala per laboratorium.</p>
            </div>
            <span className="badge badge-plain">{labs.length} lab</span>
          </div>
          <div className="table-wrap" style={{ border: "none" }}>
            <table className="table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Lab</th>
                  <th>Kehadiran</th>
                  <th>Kendala terbuka</th>
                  <th>Total tiket</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((lab) => {
                  const att = attByLab.find(([kode]) => kode === lab.kode)?.[1];
                  const iss = issueByLab[lab.kode] || { open: 0, total: 0 };
                  const rate = att && att.total ? Math.round((att.hadir / att.total) * 100) : null;
                  return (
                    <tr key={lab.id}>
                      <td>
                        <div className="num" style={{ fontWeight: 600 }}>
                          {lab.kode}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{lab.nama}</div>
                      </td>
                      <td>
                        {rate === null ? (
                          <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>belum ada data</span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 70, height: 6, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ width: `${rate}%`, height: "100%", background: rate >= 80 ? "var(--ok)" : "var(--signal)" }} />
                            </div>
                            <span className="num" style={{ fontSize: 12 }}>
                              {rate}%
                            </span>
                            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                              ({att!.hadir}/{att!.total})
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${iss.open ? "badge-warning" : "badge-success"}`}>{iss.open}</span>
                      </td>
                      <td className="num">{iss.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card reveal reveal-2">
          <div className="card-head">
            <div>
              <h2 className="card-title">Perlu perhatian</h2>
              <p className="card-note">Tiket terbuka dengan tenggat terdekat.</p>
            </div>
          </div>
          <div className="popover-list" style={{ maxHeight: 340 }}>
            {openIssues.length === 0 ? (
              <div className="empty" style={{ padding: 24 }}>
                <Icon name="check" size={22} />
                <p className="empty-title">Tidak ada kendala terbuka</p>
                <p className="empty-text">Seluruh tiket sudah selesai atau ditolak.</p>
              </div>
            ) : (
              openIssues
                .slice()
                .sort((a, b) => new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime())
                .slice(0, 6)
                .map((i) => {
                  const overdue = i.dueAt && new Date(i.dueAt) < new Date(new Date().toDateString());
                  return (
                    <div key={i.id} className="notif" style={{ cursor: "default" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{i.nomorTiket}</strong>
                        <span className={`badge ${i.urgensi === "TINGGI" ? "badge-danger" : i.urgensi === "SEDANG" ? "badge-warning" : "badge-muted"}`}>
                          {i.urgensi.toLowerCase()}
                        </span>
                      </div>
                      <div style={{ marginTop: 2 }}>{i.deskripsi}</div>
                      <span className="notif-meta">
                        <span>{i.lab?.kode} · {STATUS_LABEL[i.status] || i.status}</span>
                        <span style={{ color: overdue ? "var(--danger)" : undefined }}>{overdue ? "lewat tenggat" : "dalam tenggat"}</span>
                      </span>
                    </div>
                  );
                })
            )}
          </div>
          <div className="popover-foot">
            <span>{openIssues.length} tiket terbuka</span>
            <Link href="/issues">Buka daftar kendala</Link>
          </div>
        </div>
      </div>

      <div className="card reveal" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">Ringkasan mingguan</h2>
            <p className="card-note">Aktivitas praktikum dan kendala pada pekan terpilih.</p>
          </div>
          <div className="field" style={{ minWidth: 170 }}>
            <label htmlFor="p-week">Awal minggu</label>
            <input id="p-week" className="input" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
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
        {weekly && (
          <p className="field-hint" style={{ marginTop: 10 }}>
            Periode {weekly.weekStart} sampai {weekly.weekEnd}. Data diambil langsung dari catatan absensi dan tiket kendala.
          </p>
        )}
      </div>
    </>
  );
}
