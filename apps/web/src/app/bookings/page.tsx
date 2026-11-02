"use client";
import { useEffect, useState } from "react";
import { downloadCsv } from "@/lib/export";

const API = "http://localhost:4000";
const STATUS = ["DIAJUKAN", "DISETUJUI", "DITOLAK", "DIBATALKAN", "SELESAI"];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({ labId: "", tanggal: "", jamMulai: "08:00", jamSelesai: "10:00", keperluan: "", jumlahPeserta: "", kebutuhanKhusus: "" });
  const [msg, setMsg] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");

  async function load() {
    const url = filterStatus ? `${API}/bookings?status=${filterStatus}` : `${API}/bookings`;
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) setBookings(await res.json());
    const lres = await fetch(`${API}/labs`, { credentials: "include" });
    if (lres.ok) setLabs(await lres.json());
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
  }
  useEffect(() => { load(); }, [filterStatus]);

  const isCoord = me?.role === "COORDINATOR" || me?.role === "ADMIN_SYSTEM";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const body: any = { ...form };
    if (!body.jumlahPeserta) delete body.jumlahPeserta;
    if (!body.kebutuhanKhusus) delete body.kebutuhanKhusus;
    const res = await fetch(`${API}/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Pengajuan dibuat");
    setForm({ labId: "", tanggal: "", jamMulai: "08:00", jamSelesai: "10:00", keperluan: "", jumlahPeserta: "", kebutuhanKhusus: "" });
    load();
  }

  async function approve(id: string) { await fetch(`${API}/bookings/${id}/approve`, { method: "PATCH", credentials: "include" }); load(); }
  async function reject(id: string) {
    if (!alasan.trim()) { setMsg("Alasan wajib"); return; }
    await fetch(`${API}/bookings/${id}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ alasan }) });
    setRejectId(null); setAlasan(""); load();
  }
  async function cancel(id: string) { await fetch(`${API}/bookings/${id}/cancel`, { method: "PATCH", credentials: "include" }); load(); }

  const badge = (s: string) => {
    const map: any = { DIAJUKAN: "badge-warning", DISETUJUI: "badge-success", DITOLAK: "badge-danger", DIBATALKAN: "badge-muted", SELESAI: "badge-info" };
    return <span className={`badge ${map[s] || "badge-muted"}`}>{s}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Peminjaman Lab</h1><p className="page-subtitle">Ajukan dan kelola peminjaman laboratorium</p></div>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv("bookings.csv", bookings.map((b) => ({ peminjam: b.peminjam?.nama, lab: b.lab?.kode, tanggal: new Date(b.tanggal).toLocaleDateString("id-ID"), jamMulai: b.jamMulai, jamSelesai: b.jamSelesai, keperluan: b.keperluan, status: b.status })))}>Ekspor CSV</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Ajukan Peminjaman</h3>
        <form onSubmit={create} className="form-row">
          <select className="input" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
            <option value="">Pilih lab</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
          </select>
          <input className="input" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          <input className="input" type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} required />
          <input className="input" type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} required />
          <input className="input" placeholder="Keperluan" value={form.keperluan} onChange={(e) => setForm({ ...form, keperluan: e.target.value })} required />
          <input className="input" placeholder="Jumlah peserta" type="number" value={form.jumlahPeserta} onChange={(e) => setForm({ ...form, jumlahPeserta: e.target.value })} />
          <input className="input" placeholder="Kebutuhan khusus" value={form.kebutuhanKhusus} onChange={(e) => setForm({ ...form, kebutuhanKhusus: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Ajukan</button>
        </form>
        {msg && <div className="alert alert-info">{msg}</div>}
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <label>Filter status:</label>
        <select className="input" style={{ width: 200 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Semua</option>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Peminjam</th><th>Lab</th><th>Tanggal</th><th>Jam</th><th>Keperluan</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.peminjam?.nama}</td>
                <td>{b.lab?.kode}</td>
                <td>{new Date(b.tanggal).toLocaleDateString("id-ID")}</td>
                <td>{b.jamMulai}-{b.jamSelesai}</td>
                <td>{b.keperluan}</td>
                <td>{badge(b.status)}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {isCoord && b.status === "DIAJUKAN" && (
                      <>
                        <button className="btn btn-sm" onClick={() => approve(b.id)}>Setujui</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRejectId(b.id)}>Tolak</button>
                      </>
                    )}
                    {(b.peminjam?.email === me?.email || isCoord) && (b.status === "DIAJUKAN" || b.status === "DISETUJUI") && (
                      <button className="btn btn-secondary btn-sm" onClick={() => cancel(b.id)}>Batalkan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectId && (
        <div className="panel" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <h4 style={{ margin: "0 0 8px" }}>Alasan penolakan</h4>
          <textarea className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => reject(rejectId)}>Kirim</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setRejectId(null); setAlasan(""); }}>Batal</button>
          </div>
        </div>
      )}
    </>
  );
}
