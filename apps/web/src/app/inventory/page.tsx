"use client";
import { useEffect, useState } from "react";
import { downloadCsv } from "@/lib/export";

const API = "http://localhost:4000";
const KONDISI = ["BAIK", "PERLU_PERAWATAN", "RUSAK", "DIHAPUSKAN"];
const KATEGORI = ["PC", "JARINGAN", "PERIFERAL", "PERANGKAT_PENDUKUNG"];

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [filterKondisi, setFilterKondisi] = useState("");
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState({ kodeAset: "", nama: "", kategori: "PC", labId: "", kondisi: "BAIK", tanggalPerolehan: "", catatan: "" });
  const [mutateId, setMutateId] = useState<string | null>(null);
  const [mutateLab, setMutateLab] = useState("");

  async function load() {
    let url = `${API}/inventory`;
    const params: string[] = [];
    if (filterLab) params.push(`labId=${filterLab}`);
    if (filterKondisi) params.push(`kondisi=${filterKondisi}`);
    if (params.length) url += "?" + params.join("&");
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) setItems(await res.json());
    const lres = await fetch(`${API}/labs`, { credentials: "include" });
    if (lres.ok) setLabs(await lres.json());
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
  }
  useEffect(() => { load(); }, [filterLab, filterKondisi]);

  const isAdmin = me?.role === "ADMIN_SYSTEM";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const body: any = { ...form };
    if (!body.tanggalPerolehan) delete body.tanggalPerolehan;
    if (!body.catatan) delete body.catatan;
    const res = await fetch(`${API}/inventory`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Item dibuat");
    setForm({ kodeAset: "", nama: "", kategori: "PC", labId: "", kondisi: "BAIK", tanggalPerolehan: "", catatan: "" });
    load();
  }

  async function updateKondisi(id: string, kondisi: string) {
    await fetch(`${API}/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ kondisi }) });
    load();
  }

  async function doMutate(id: string) {
    if (!mutateLab) { setMsg("Pilih lab tujuan"); return; }
    await fetch(`${API}/inventory/${id}/mutate`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ labTujuanId: mutateLab }) });
    setMutateId(null); setMutateLab(""); load();
  }

  async function remove(id: string) {
    await fetch(`${API}/inventory/${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const badge = (k: string) => {
    const map: any = { BAIK: "badge-success", PERLU_PERAWATAN: "badge-warning", RUSAK: "badge-danger", DIHAPUSKAN: "badge-muted" };
    return <span className={`badge ${map[k] || "badge-muted"}`}>{k}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Inventaris Lab</h1><p className="page-subtitle">Kelola aset dan kondisi perangkat</p></div>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv("inventory.csv", items.map((it) => ({ kodeAset: it.kodeAset, nama: it.nama, kategori: it.kategori, lab: it.lab?.kode, kondisi: it.kondisi })))}>Ekspor CSV</button>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Tambah Item</h3>
          <form onSubmit={create} className="form-row">
            <input className="input" placeholder="Kode aset" value={form.kodeAset} onChange={(e) => setForm({ ...form, kodeAset: e.target.value })} required />
            <input className="input" placeholder="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            <select className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
              {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className="input" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
              <option value="">Pilih lab</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
            </select>
            <select className="input" value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })}>
              {KONDISI.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input className="input" type="date" value={form.tanggalPerolehan} onChange={(e) => setForm({ ...form, tanggalPerolehan: e.target.value })} />
            <input className="input" placeholder="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} style={{ gridColumn: "1 / -1" }} />
            <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Simpan</button>
          </form>
          {msg && <div className="alert alert-info">{msg}</div>}
        </div>
      )}

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>Lab:</label>
        <select className="input" style={{ width: 200 }} value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
          <option value="">Semua</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.kode}</option>)}
        </select>
        <label>Kondisi:</label>
        <select className="input" style={{ width: 200 }} value={filterKondisi} onChange={(e) => setFilterKondisi(e.target.value)}>
          <option value="">Semua</option>
          {KONDISI.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Kode Aset</th><th>Nama</th><th>Kategori</th><th>Lab</th><th>Kondisi</th><th>Aksi</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td><strong>{it.kodeAset}</strong></td>
                <td>{it.nama}</td>
                <td>{it.kategori}</td>
                <td>{it.lab?.kode}</td>
                <td>
                  {isAdmin ? (
                    <select className="input" style={{ width: 160, padding: 4 }} value={it.kondisi} onChange={(e) => updateKondisi(it.id, e.target.value)}>
                      {KONDISI.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  ) : <span className={`badge ${it.kondisi === "BAIK" ? "badge-success" : it.kondisi === "RUSAK" ? "badge-danger" : "badge-warning"}`}>{it.kondisi}</span>}
                </td>
                <td>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setMutateId(it.id)}>Mutasi</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(it.id)}>Hapus</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mutateId && (
        <div className="panel" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <h4 style={{ margin: "0 0 8px" }}>Mutasi Item ke Lab Lain</h4>
          <select className="input" style={{ maxWidth: 320 }} value={mutateLab} onChange={(e) => setMutateLab(e.target.value)}>
            <option value="">Pilih lab tujuan</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
          </select>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={() => doMutate(mutateId)}>Mutasi</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setMutateId(null); setMutateLab(""); }}>Batal</button>
          </div>
        </div>
      )}
    </>
  );
}
