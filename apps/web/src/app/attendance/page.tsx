"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";

export default function AttendancePage() {
  const [me, setMe] = useState<any>(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);

  async function load() {
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
    const res = await fetch(`${API}/attendance`, { credentials: "include" });
    if (res.ok) setList(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setResult(null);
    const res = await fetch(`${API}/attendance/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ qrToken: token }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setResult(data);
    setMsg("Absensi berhasil: " + data.status);
    setToken("");
    load();
  }

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Absensi</h1><p className="page-subtitle">Scan QR lab untuk mencatat kehadiran</p></div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
        <h3 className="card-title">Scan QR Lab</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>Masukkan atau pindai token QR yang terpasang di lab.</p>
        <form onSubmit={scan} style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Token QR lab" value={token} onChange={(e) => setToken(e.target.value)} required />
          <button className="btn" type="submit">Scan</button>
        </form>
        {msg && <div className={`alert ${msg.includes("berhasil") ? "alert-success" : "alert-danger"}`} style={{ marginTop: 8 }}>{msg}</div>}
        {result && (
          <div className="alert alert-info" style={{ marginTop: 8 }}>
            Sesi: {result.session?.mataKuliah} ({result.session?.kelas}) - Status: <strong>{result.status}</strong>
          </div>
        )}
      </div>

      <h3 style={{ margin: "16px 0 8px" }}>Riwayat Absensi ({list.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Pengguna</th><th>Sesi</th><th>Lab</th><th>Waktu Scan</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.user?.nama}</td>
                <td>{a.sesi?.mataKuliah} ({a.sesi?.kelas})</td>
                <td>{a.lab?.kode}</td>
                <td>{new Date(a.scannedAt).toLocaleString("id-ID")}</td>
                <td><span className={`badge ${a.status === "HADIR" ? "badge-success" : a.status === "TERLAMBAT" ? "badge-warning" : "badge-muted"}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
