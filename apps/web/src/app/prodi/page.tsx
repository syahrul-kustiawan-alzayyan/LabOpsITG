"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";

export default function ProdiPage() {
  const [dash, setDash] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [labs, setLabs] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [issues, setIssues] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  async function load() {
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
    const dres = await fetch(`${API}/reports/dashboard`, { credentials: "include" });
    if (dres.ok) setDash(await dres.json());
    const lres = await fetch(`${API}/labs`, { credentials: "include" });
    if (lres.ok) setLabs(await lres.json());
    const ires = await fetch(`${API}/issues`, { credentials: "include" });
    if (ires.ok) setIssues(await ires.json());
    const ares = await fetch(`${API}/attendance`, { credentials: "include" });
    if (ares.ok) setAttendance(await ares.json());
  }

  async function loadWeekly() {
    let url = `${API}/reports/weekly?weekStart=${weekStart}`;
    if (filterLab) url += `&labId=${filterLab}`;
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) setWeekly(await res.json());
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadWeekly(); }, [weekStart, filterLab]);

  const card = (title: string, value: any) => (
    <div className="stat-card">
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );

  // attendance by lab
  const attByLab: Record<string, { total: number; hadir: number }> = {};
  for (const a of attendance) {
    const kode = a.lab?.kode || a.labId;
    if (!attByLab[kode]) attByLab[kode] = { total: 0, hadir: 0 };
    attByLab[kode].total++;
    if (a.status === "HADIR" || a.status === "TERLAMBAT") attByLab[kode].hadir++;
  }

  const openIssues = issues.filter((i) => i.status !== "SELESAI" && i.status !== "DITOLAK");

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dasbor Prodi</h1>
          <p className="page-subtitle">Ringkasan operasional untuk pimpinan program studi</p>
        </div>
      </div>

      {dash && (
        <section style={{ marginBottom: 24 }}>
          <div className="stat-grid">
            {card("Pengguna Aktif", dash.users)}
            {card("Lab Aktif", dash.labs)}
            {card("Jadwal Aktif", dash.schedules)}
            {card("Avg Penanganan (jam)", dash.avgIssueHandlingHours)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 16 }}>
            {[
              { title: "Peminjaman", data: dash.bookings },
              { title: "Kendala", data: dash.issues },
              { title: "Kehadiran", data: dash.attendance },
              { title: "Inventaris", data: dash.inventory },
            ].map((g) => (
              <div className="card" key={g.title}>
                <h3 className="card-title">{g.title}</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {Object.entries(g.data || {}).map(([k, v]) => <li key={k}>{k}: <strong>{v as any}</strong></li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Laporan Mingguan Praktikum</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <label>Mulai minggu:</label>
          <input className="input" style={{ width: 160 }} type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          <label>Lab:</label>
          <select className="input" style={{ width: 200 }} value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
            <option value="">Semua</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.kode}</option>)}
          </select>
        </div>
        {weekly && (
          <div>
            <p style={{ margin: "0 0 8px" }}>Periode: <strong>{weekly.weekStart}</strong> s/d <strong>{weekly.weekEnd}</strong></p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div className="stat-card"><div className="stat-label">Sesi Terjadwal</div><div className="stat-value">{weekly.sessionsScheduled}</div></div>
              <div className="stat-card"><div className="stat-label">Sesi dengan Absensi</div><div className="stat-value">{weekly.sessionsWithAttendance}</div></div>
              <div className="stat-card"><div className="stat-label">Peminjaman Dibatalkan</div><div className="stat-value">{weekly.cancelledBookings}</div></div>
              <div className="stat-card"><div className="stat-label">Kendala Baru</div><div className="stat-value">{weekly.issuesCreated}</div></div>
            </div>
            <h4 style={{ margin: "12px 0 4px" }}>Kehadiran</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {Object.entries(weekly.attendance || {}).map(([k, v]) => <li key={k}>{k}: {v as any}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h3 className="card-title">Kehadiran per Lab</h3>
          {Object.keys(attByLab).length === 0 && <p style={{ color: "var(--text-muted)" }}>Belum ada data.</p>}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {Object.entries(attByLab).map(([kode, v]) => (
              <li key={kode}>{kode}: {v.hadir}/{v.total} hadir</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="card-title">Kendala Terbuka ({openIssues.length})</h3>
          {openIssues.length === 0 && <p style={{ color: "var(--text-muted)" }}>Tidak ada kendala terbuka.</p>}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {openIssues.slice(0, 8).map((i) => (
              <li key={i.id}>{i.nomorTiket} - {i.lab?.kode} ({i.urgensi}) - {i.status}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/reports" className="btn btn-secondary btn-sm">Laporan Lengkap</a>
        <a href="/attendance" className="btn btn-secondary btn-sm">Riwayat Absensi</a>
        <a href="/schedules" className="btn btn-secondary btn-sm">Jadwal Lab</a>
        <a href="/issues" className="btn btn-secondary btn-sm">Kendala</a>
      </div>
    </>
  );
}
