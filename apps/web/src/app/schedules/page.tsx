"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [meId, setMeId] = useState("");
  const [form, setForm] = useState({ labId: "", mataKuliah: "", kelas: "", pengampuId: "", hari: 1, jamMulai: "08:00", jamSelesai: "10:00", tanggalMulai: "", tanggalSelesai: "", semester: "", jenis: "PRAKTIKUM_RUTIN" });
  const [msg, setMsg] = useState("");

  async function load() {
    // get current user id
    if (!meId) {
      const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (mres.ok) setMeId((await mres.json()).user.sub);
    }
    const uid = meId || (await (async () => { const r = await fetch(`${API}/auth/me`, { credentials: "include" }); return r.ok ? (await r.json()).user.sub : ""; })());
    let url = `${API}/schedules`;
    const params: string[] = [];
    if (filterLab) params.push(`labId=${filterLab}`);
    if (myOnly && uid) params.push(`pengampuId=${uid}`);
    if (params.length) url += "?" + params.join("&");
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) setSchedules(await res.json());
    const lres = await fetch(`${API}/labs`, { credentials: "include" });
    if (lres.ok) setLabs(await lres.json());
    const ures = await fetch(`${API}/users`, { credentials: "include" });
    if (ures.ok) setUsers(await ures.json());
  }
  useEffect(() => { load(); }, [filterLab, myOnly]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const body: any = { ...form, hari: Number(form.hari) };
    if (!body.pengampuId) delete body.pengampuId;
    const res = await fetch(`${API}/schedules`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Jadwal dibuat");
    setForm({ ...form, mataKuliah: "", kelas: "" });
    load();
  }

  async function remove(id: string) {
    await fetch(`${API}/schedules/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const grouped: Record<number, any[]> = {};
  for (const s of schedules) { if (!grouped[s.hari]) grouped[s.hari] = []; grouped[s.hari].push(s); }

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Jadwal Lab</h1><p className="page-subtitle">Kelola jadwal praktikum dan kegiatan</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Tambah Jadwal</h3>
        <form onSubmit={create} className="form-row">
          <select className="input" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
            <option value="">Pilih lab</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
          </select>
          <input className="input" placeholder="Mata kuliah" value={form.mataKuliah} onChange={(e) => setForm({ ...form, mataKuliah: e.target.value })} required />
          <input className="input" placeholder="Kelas" value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} required />
          <select className="input" value={form.hari} onChange={(e) => setForm({ ...form, hari: Number(e.target.value) })}>
            {HARI.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
          <input className="input" type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} required />
          <input className="input" type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} required />
          <input className="input" type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} required />
          <input className="input" type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} required />
          <input className="input" placeholder="Semester (2026/1)" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
          <select className="input" value={form.pengampuId} onChange={(e) => setForm({ ...form, pengampuId: e.target.value })}>
            <option value="">Pengampu (opsional)</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
          </select>
          <select className="input" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
            <option value="PRAKTIKUM_RUTIN">Praktikum Rutin</option>
            <option value="KEGIATAN_KHUSUS">Kegiatan Khusus</option>
          </select>
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Simpan</button>
        </form>
        {msg && <div className="alert alert-info">{msg}</div>}
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>Filter lab:</label>
        <select className="input" style={{ width: 240 }} value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
          <option value="">Semua</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
          Jadwal saya (sebagai pengampu)
        </label>
      </div>

      {HARI.map((h, i) => {
        const items = grouped[i] || [];
        if (items.length === 0) return null;
        return (
          <div key={i} className="card" style={{ marginBottom: 16 }}>
            <h3 className="card-title">{h}</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Lab</th><th>Mata Kuliah</th><th>Kelas</th><th>Jam</th><th>Periode</th><th>Jenis</th><th></th></tr></thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id}>
                      <td>{s.lab?.kode}</td>
                      <td>{s.mataKuliah}</td>
                      <td>{s.kelas}</td>
                      <td>{s.jamMulai}-{s.jamSelesai}</td>
                      <td>{new Date(s.tanggalMulai).toLocaleDateString("id-ID")} - {new Date(s.tanggalSelesai).toLocaleDateString("id-ID")}</td>
                      <td><span className="badge badge-muted">{s.jenis}</span></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
