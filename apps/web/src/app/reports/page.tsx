"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";

export default function ReportsPage() {
  const [dash, setDash] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [labs, setLabs] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");

  async function loadDash() {
    const res = await fetch(`${API}/reports/dashboard`, { credentials: "include" });
    if (res.ok) setDash(await res.json());
  }
  async function loadWeekly() {
    let url = `${API}/reports/weekly?weekStart=${weekStart}`;
    if (filterLab) url += `&labId=${filterLab}`;
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) setWeekly(await res.json());
  }
  async function loadLabs() {
    const res = await fetch(`${API}/labs`, { credentials: "include" });
    if (res.ok) setLabs(await res.json());
  }

  useEffect(() => { loadDash(); loadLabs(); }, []);
  useEffect(() => { loadWeekly(); }, [weekStart, filterLab]);

  const card = (title: string, value: any) => (
    <div className="stat-card">
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Laporan & Dasbor</h1><p className="page-subtitle">Ringkasan operasional laboratorium</p></div>
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

      <div className="card">
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
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Sesi terjadwal: {weekly.sessionsScheduled}</li>
              <li>Sesi dengan absensi: {weekly.sessionsWithAttendance}</li>
              <li>Peminjaman dibatalkan: {weekly.cancelledBookings}</li>
              <li>Kendala baru pekan ini: {weekly.issuesCreated}</li>
            </ul>
            <h4 style={{ margin: "12px 0 4px" }}>Kehadiran</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {Object.entries(weekly.attendance || {}).map(([k, v]) => <li key={k}>{k}: {v as any}</li>)}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
