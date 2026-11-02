"use client";
import { useEffect, useState } from "react";
import { downloadCsv } from "@/lib/export";

const API = "http://localhost:4000";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ nama: "", email: "", password: "", role: "USER" });
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`${API}/users`, { credentials: "include" });
    if (res.ok) setUsers(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`${API}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("User dibuat");
    setForm({ nama: "", email: "", password: "", role: "USER" });
    load();
  }

  async function deactivate(id: string) {
    await fetch(`${API}/users/${id}/deactivate`, { method: "PATCH", credentials: "include" });
    load();
  }

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Manajemen Pengguna</h1><p className="page-subtitle">Kelola akun dan peran pengguna lab</p></div>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv("users.csv", users.map((u) => ({ nama: u.nama, email: u.email, role: u.role, status: u.status })))}>Ekspor CSV</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Tambah Pengguna</h3>
        <form onSubmit={create} className="form-row">
          <input className="input" placeholder="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder="Kata sandi" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="USER">Pengguna Lab</option>
            <option value="COORDINATOR">Koordinator Lab</option>
            <option value="LEADER">Pimpinan</option>
            <option value="ADMIN_SYSTEM">Admin Sistem</option>
          </select>
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Simpan</button>
        </form>
        {msg && <div className="alert alert-success">{msg}</div>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nama}</td>
                <td>{u.email}</td>
                <td><span className="badge badge-info">{u.role}</span></td>
                <td><span className={`badge ${u.status === "ACTIVE" ? "badge-success" : "badge-muted"}`}>{u.status}</span></td>
                <td>
                  {u.status === "ACTIVE" && <button className="btn btn-danger btn-sm" onClick={() => deactivate(u.id)}>Nonaktifkan</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
