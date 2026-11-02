"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";
const KATEGORI = ["PERANGKAT", "JARINGAN", "LISTRIK", "PERANGKAT_LUNAK", "FASILITAS", "LAINNYA"];
const URGENSI = ["RENDAH", "SEDANG", "TINGGI"];
const STATUS = ["BARU", "DIVERIFIKASI", "DALAM_PENANGANAN", "SELESAI", "DITOLAK"];

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ labId: "", itemId: "", kategori: "PERANGKAT", urgensi: "SEDANG", deskripsi: "", foto: "" });
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [pjId, setPjId] = useState("");

  async function load() {
    let url = `${API}/issues`;
    const params: string[] = [];
    if (filterStatus) params.push(`status=${filterStatus}`);
    if (filterLab) params.push(`labId=${filterLab}`);
    if (params.length) url += "?" + params.join("&");
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) setIssues(await res.json());
    const lres = await fetch(`${API}/labs`, { credentials: "include" });
    if (lres.ok) setLabs(await lres.json());
    const ires = await fetch(`${API}/inventory`, { credentials: "include" });
    if (ires.ok) setItems(await ires.json());
    const ures = await fetch(`${API}/users`, { credentials: "include" });
    if (ures.ok) setUsers(await ures.json());
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
  }
  useEffect(() => { load(); }, [filterStatus, filterLab]);

  const isCoord = me?.role === "COORDINATOR" || me?.role === "ADMIN_SYSTEM";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const body: any = { labId: form.labId, kategori: form.kategori, urgensi: form.urgensi, deskripsi: form.deskripsi };
    if (form.itemId) body.itemId = form.itemId;
    if (form.foto.trim()) body.fotoUrls = form.foto.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch(`${API}/issues`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Tiket dibuat: " + data.nomorTiket);
    setForm({ labId: "", itemId: "", kategori: "PERANGKAT", urgensi: "SEDANG", deskripsi: "", foto: "" });
    load();
  }

  async function verify(id: string) {
    if (!pjId) { setMsg("Pilih penanggung jawab"); return; }
    await fetch(`${API}/issues/${id}/verify`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ penanggungJawabId: pjId, catatan: "Diverifikasi" }) });
    setVerifyId(null); setPjId(""); load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`${API}/issues/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status, catatan: "" }) });
    load();
  }

  async function reopen(id: string) {
    await fetch(`${API}/issues/${id}/reopen`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ catatan: "Dibuka kembali" }) });
    load();
  }

  const badge = (s: string) => {
    const map: any = { BARU: "badge-warning", DIVERIFIKASI: "badge-info", DALAM_PENANGANAN: "badge-info", SELESAI: "badge-success", DITOLAK: "badge-danger" };
    return <span className={`badge ${map[s] || "badge-muted"}`}>{s}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Kendala Lab</h1><p className="page-subtitle">Pelaporan dan penanganan kendala fasilitas</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Lapor Kendala</h3>
        <form onSubmit={create} className="form-row">
          <select className="input" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
            <option value="">Pilih lab</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
          </select>
          <select className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
            {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select className="input" value={form.urgensi} onChange={(e) => setForm({ ...form, urgensi: e.target.value })}>
            {URGENSI.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className="input" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
            <option value="">Item inventaris (opsional)</option>
            {items.map((it) => <option key={it.id} value={it.id}>{it.kodeAset} - {it.nama}</option>)}
          </select>
          <textarea className="input" placeholder="Deskripsi kendala" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} required style={{ gridColumn: "1 / -1" }} rows={3} />
          <input className="input" placeholder="URL foto (pisahkan koma)" value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Kirim Laporan</button>
        </form>
        {msg && <div className="alert alert-info">{msg}</div>}
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>Status:</label>
        <select className="input" style={{ width: 200 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Semua</option>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label>Lab:</label>
        <select className="input" style={{ width: 200 }} value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
          <option value="">Semua</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.kode}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Tiket</th><th>Lab</th><th>Kategori</th><th>Urgensi</th><th>Pelapor</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {issues.map((iss) => (
              <tr key={iss.id}>
                <td><strong>{iss.nomorTiket}</strong></td>
                <td>{iss.lab?.kode}</td>
                <td>{iss.kategori}</td>
                <td>{iss.urgensi}</td>
                <td>{iss.pelapor?.nama}</td>
                <td>{badge(iss.status)}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {isCoord && iss.status === "BARU" && <button className="btn btn-sm" onClick={() => setVerifyId(iss.id)}>Verifikasi</button>}
                    {isCoord && iss.status === "DIVERIFIKASI" && <button className="btn btn-sm" onClick={() => updateStatus(iss.id, "DALAM_PENANGANAN")}>Tangani</button>}
                    {isCoord && iss.status === "DALAM_PENANGANAN" && <button className="btn btn-success btn-sm" onClick={() => updateStatus(iss.id, "SELESAI")}>Selesai</button>}
                    {iss.status === "SELESAI" && iss.pelapor?.email === me?.email && <button className="btn btn-secondary btn-sm" onClick={() => reopen(iss.id)}>Buka Kembali</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {verifyId && (
        <div className="panel" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <h4 style={{ margin: "0 0 8px" }}>Verifikasi Tiket</h4>
          <select className="input" value={pjId} onChange={(e) => setPjId(e.target.value)} style={{ maxWidth: 320 }}>
            <option value="">Pilih penanggung jawab</option>
            {users.filter((u) => u.role === "COORDINATOR" || u.role === "ADMIN_SYSTEM").map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
          </select>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={() => verify(verifyId)}>Verifikasi</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setVerifyId(null); setPjId(""); }}>Batal</button>
          </div>
        </div>
      )}
    </>
  );
}
