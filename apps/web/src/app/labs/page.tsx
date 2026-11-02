"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";

export default function LabsPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [form, setForm] = useState({ kode: "", nama: "", kapasitas: 30, lokasi: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`${API}/labs`, { credentials: "include" });
    if (res.ok) setLabs(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`${API}/labs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, kapasitas: Number(form.kapasitas) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Lab dibuat");
    setForm({ kode: "", nama: "", kapasitas: 30, lokasi: "" });
    load();
  }

  async function remove(id: string) {
    await fetch(`${API}/labs/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Manajemen Lab</h1><p className="page-subtitle">Kelola laboratorium dan QR code absensi</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Tambah Lab</h3>
        <form onSubmit={create} className="form-row">
          <input className="input" placeholder="Kode (LAB-1)" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} required />
          <input className="input" placeholder="Nama lab" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
          <input className="input" placeholder="Kapasitas" type="number" value={form.kapasitas} onChange={(e) => setForm({ ...form, kapasitas: Number(e.target.value) })} required />
          <input className="input" placeholder="Lokasi" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} required />
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Simpan</button>
        </form>
        {msg && <div className="alert alert-success">{msg}</div>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Kode</th><th>Nama</th><th>Kapasitas</th><th>Lokasi</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {labs.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.kode}</strong></td>
                <td>{l.nama}</td>
                <td>{l.kapasitas}</td>
                <td>{l.lokasi}</td>
                <td><span className={`badge ${l.status === "AKTIF" ? "badge-success" : "badge-muted"}`}>{l.status}</span></td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(l.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
