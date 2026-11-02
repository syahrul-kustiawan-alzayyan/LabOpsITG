"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function StaffPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [pengampuId, setPengampuId] = useState("");
  const [asistenIds, setAsistenIds] = useState<string[]>([]);

  async function load() {
    const res = await fetch(`${API}/schedules`, { credentials: "include" });
    if (res.ok) setSchedules(await res.json());
    const ures = await fetch(`${API}/users`, { credentials: "include" });
    if (ures.ok) setUsers(await ures.json());
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
  }

  useEffect(() => { load(); }, []);

  const isCoord = me?.role === "COORDINATOR" || me?.role === "ADMIN_SYSTEM";
  const instructors = users.filter((u) => u.subRoles?.includes("DOSEN") || u.subRoles?.includes("INSTRUKTUR") || u.role === "COORDINATOR");
  const assistants = users.filter((u) => u.subRoles?.includes("ASISTEN_DOSEN") || u.subRoles?.includes("INSTRUKTUR") || u.role === "COORDINATOR");

  function openEdit(s: any) {
    setEditId(s.id);
    setPengampuId(s.pengampu?.id || s.pengampuId || "");
    setAsistenIds(s.asistenIds || []);
  }

  async function save() {
    if (!editId) return;
    setMsg("");
    const res = await fetch(`${API}/schedules/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pengampuId: pengampuId || null, asistenIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Penugasan disimpan");
    setEditId(null);
    load();
  }

  function toggleAsisten(id: string) {
    setAsistenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // summary by course
  const byCourse: Record<string, { count: number; pengampu: Set<string>; asisten: Set<string> }> = {};
  for (const s of schedules) {
    const key = s.mataKuliah;
    if (!byCourse[key]) byCourse[key] = { count: 0, pengampu: new Set(), asisten: new Set() };
    byCourse[key].count++;
    if (s.pengampu?.nama) byCourse[key].pengampu.add(s.pengampu.nama);
    for (const a of s.asisten || []) byCourse[key].asisten.add(a.nama);
  }

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Instruktur & Asisten Dosen</h1><p className="page-subtitle">Penugasan pengampu dan asisten per mata kuliah praktikum</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Ringkasan per Mata Kuliah</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Mata Kuliah</th><th>Sesi</th><th>Instruktur</th><th>Asisten Dosen</th></tr></thead>
            <tbody>
              {Object.entries(byCourse).map(([mk, info]) => (
                <tr key={mk}>
                  <td>{mk}</td>
                  <td>{info.count}</td>
                  <td>{Array.from(info.pengampu).join(", ") || "-"}</td>
                  <td>{Array.from(info.asisten).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{ margin: "16px 0 8px" }}>Penugasan per Sesi Jadwal ({schedules.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Lab</th><th>Hari</th><th>Jam</th><th>Mata Kuliah</th><th>Kelas</th><th>Instruktur</th><th>Asisten Dosen</th><th>Aksi</th></tr></thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.lab?.kode}</td>
                <td>{HARI[s.hari]}</td>
                <td>{s.jamMulai}-{s.jamSelesai}</td>
                <td>{s.mataKuliah}</td>
                <td>{s.kelas}</td>
                <td>{s.pengampu?.nama || "-"}</td>
                <td>{(s.asisten || []).map((a: any) => a.nama).join(", ") || "-"}</td>
                <td>
                  {isCoord && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Atur</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editId && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h4 style={{ margin: "0 0 8px" }}>Atur Penugasan</h4>
          <div style={{ marginBottom: 8 }}>
            <label>Instruktur (pengampu)</label>
            <select className="input" style={{ maxWidth: 320 }} value={pengampuId} onChange={(e) => setPengampuId(e.target.value)}>
              <option value="">- Tidak ada -</option>
              {instructors.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Asisten Dosen (bisa lebih dari satu)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {assistants.map((u) => (
                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={asistenIds.includes(u.id)} onChange={() => toggleAsisten(u.id)} />
                  {u.nama}
                </label>
              ))}
            </div>
          </div>
          {msg && <div className="alert alert-info">{msg}</div>}
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={save}>Simpan</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditId(null); setMsg(""); }}>Batal</button>
          </div>
        </div>
      )}
    </>
  );
}
