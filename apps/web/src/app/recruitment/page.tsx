"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";
const STATUS = ["DIAJUKAN", "DIPROSES", "WAWANCARA", "DITERIMA", "DITOLAK", "CADANGAN"];

export default function RecruitmentPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"periods" | "apply" | "mine" | "manage">("periods");

  const [periodForm, setPeriodForm] = useState({ posisi: "", mataKuliah: "", kuota: 3, persyaratan: "", tenggat: "" });
  const [applyForm, setApplyForm] = useState({ periodId: "", mataKuliahDilamar: "", motivasi: "", nilai: "", ketersediaan: "", cvUrl: "", transkripUrl: "" });
  const [statusId, setStatusId] = useState<string | null>(null);
  const [statusVal, setStatusVal] = useState("DIPROSES");
  const [catatan, setCatatan] = useState("");

  const isCoord = me?.role === "COORDINATOR" || me?.role === "ADMIN_SYSTEM";

  async function load() {
    const pres = await fetch(`${API}/recruitment/periods`, { credentials: "include" });
    if (pres.ok) setPeriods(await pres.json());
    const mres = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (mres.ok) setMe((await mres.json()).user);
    const mmine = await fetch(`${API}/recruitment/applications/mine`, { credentials: "include" });
    if (mmine.ok) setMine(await mmine.json());
    if (isCoord) {
      const ares = await fetch(`${API}/recruitment/applications`, { credentials: "include" });
      if (ares.ok) setApplications(await ares.json());
    }
  }
  useEffect(() => { load(); }, []);

  async function createPeriod(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`${API}/recruitment/periods`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(periodForm) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Periode dibuat");
    setPeriodForm({ posisi: "", mataKuliah: "", kuota: 3, persyaratan: "", tenggat: "" });
    load();
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const body: any = { ...applyForm };
    if (body.nilai) body.nilai = Number(body.nilai);
    if (!body.cvUrl) delete body.cvUrl;
    if (!body.transkripUrl) delete body.transkripUrl;
    const res = await fetch(`${API}/recruitment/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data?.message || "Gagal"); return; }
    setMsg("Lamaran terkirim");
    setApplyForm({ periodId: "", mataKuliahDilamar: "", motivasi: "", nilai: "", ketersediaan: "", cvUrl: "", transkripUrl: "" });
    load();
  }

  async function updateStatus(id: string) {
    await fetch(`${API}/recruitment/applications/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: statusVal, catatan }) });
    setStatusId(null); setCatatan(""); load();
  }

  async function closePeriod(id: string) {
    await fetch(`${API}/recruitment/periods/${id}/close`, { method: "PATCH", credentials: "include" });
    load();
  }

  const openPeriods = periods.filter((p) => p.status === "DIBUKA");

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Rekrutmen</h1><p className="page-subtitle">Instruktur & Asisten Dosen</p></div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["periods", "apply", "mine"] as const).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? "" : "btn-secondary"}`} onClick={() => setTab(t)}>{t === "periods" ? "Periode" : t === "apply" ? "Lamar" : "Lamaran Saya"}</button>
        ))}
        {isCoord && <button className={`btn btn-sm ${tab === "manage" ? "" : "btn-secondary"}`} onClick={() => setTab("manage")}>Kelola</button>}
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {tab === "periods" && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Posisi</th><th>Mata Kuliah</th><th>Kuota</th><th>Tenggat</th><th>Status</th><th>Pelamar</th></tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td>{p.posisi}</td>
                  <td>{p.mataKuliah}</td>
                  <td>{p.kuota}</td>
                  <td>{new Date(p.tenggat).toLocaleDateString("id-ID")}</td>
                  <td><span className={`badge ${p.status === "DIBUKA" ? "badge-success" : "badge-muted"}`}>{p.status}</span></td>
                  <td>{p._count?.applications ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "apply" && (
        <div className="card">
          <h3 className="card-title">Ajukan Lamaran</h3>
          <form onSubmit={apply} className="form-row">
            <select className="input" value={applyForm.periodId} onChange={(e) => setApplyForm({ ...applyForm, periodId: e.target.value })} required>
              <option value="">Pilih periode</option>
              {openPeriods.map((p) => <option key={p.id} value={p.id}>{p.posisi} - {p.mataKuliah}</option>)}
            </select>
            <input className="input" placeholder="Mata kuliah yang dilamar" value={applyForm.mataKuliahDilamar} onChange={(e) => setApplyForm({ ...applyForm, mataKuliahDilamar: e.target.value })} required />
            <textarea className="input" placeholder="Motivasi" value={applyForm.motivasi} onChange={(e) => setApplyForm({ ...applyForm, motivasi: e.target.value })} style={{ gridColumn: "1 / -1" }} rows={3} />
            <input className="input" placeholder="Nilai (IPK)" type="number" step="0.01" value={applyForm.nilai} onChange={(e) => setApplyForm({ ...applyForm, nilai: e.target.value })} />
            <input className="input" placeholder="Ketersediaan waktu" value={applyForm.ketersediaan} onChange={(e) => setApplyForm({ ...applyForm, ketersediaan: e.target.value })} />
            <input className="input" placeholder="URL CV" value={applyForm.cvUrl} onChange={(e) => setApplyForm({ ...applyForm, cvUrl: e.target.value })} />
            <input className="input" placeholder="URL Transkrip" value={applyForm.transkripUrl} onChange={(e) => setApplyForm({ ...applyForm, transkripUrl: e.target.value })} />
            <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Kirim Lamaran</button>
          </form>
        </div>
      )}

      {tab === "mine" && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Posisi</th><th>Mata Kuliah</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>
              {mine.map((a) => (
                <tr key={a.id}>
                  <td>{a.period?.posisi}</td>
                  <td>{a.mataKuliahDilamar}</td>
                  <td><span className="badge badge-info">{a.status}</span></td>
                  <td>{a.catatanPenilaian}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "manage" && isCoord && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title">Buka Periode Rekrutmen</h3>
            <form onSubmit={createPeriod} className="form-row">
              <input className="input" placeholder="Posisi" value={periodForm.posisi} onChange={(e) => setPeriodForm({ ...periodForm, posisi: e.target.value })} required />
              <input className="input" placeholder="Mata kuliah" value={periodForm.mataKuliah} onChange={(e) => setPeriodForm({ ...periodForm, mataKuliah: e.target.value })} required />
              <input className="input" placeholder="Kuota" type="number" value={periodForm.kuota} onChange={(e) => setPeriodForm({ ...periodForm, kuota: Number(e.target.value) })} required />
              <input className="input" type="date" value={periodForm.tenggat} onChange={(e) => setPeriodForm({ ...periodForm, tenggat: e.target.value })} required />
              <textarea className="input" placeholder="Persyaratan" value={periodForm.persyaratan} onChange={(e) => setPeriodForm({ ...periodForm, persyaratan: e.target.value })} style={{ gridColumn: "1 / -1" }} rows={2} />
              <button className="btn" type="submit" style={{ gridColumn: "1 / -1" }}>Buka Periode</button>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title">Kelola Periode</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Posisi</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id}>
                      <td>{p.posisi} - {p.mataKuliah}</td>
                      <td><span className={`badge ${p.status === "DIBUKA" ? "badge-success" : "badge-muted"}`}>{p.status}</span></td>
                      <td>{p.status === "DIBUKA" && <button className="btn btn-danger btn-sm" onClick={() => closePeriod(p.id)}>Tutup</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Kelola Lamaran ({applications.length})</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Pelamar</th><th>Posisi</th><th>MK Dilamar</th><th>Nilai</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id}>
                      <td>{a.pelamar?.nama}</td>
                      <td>{a.period?.posisi}</td>
                      <td>{a.mataKuliahDilamar}</td>
                      <td>{a.nilai}</td>
                      <td><span className="badge badge-info">{a.status}</span></td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => setStatusId(a.id)}>Ubah Status</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {statusId && (
            <div className="panel" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
              <h4 style={{ margin: "0 0 8px" }}>Ubah Status Lamaran</h4>
              <select className="input" style={{ maxWidth: 240 }} value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea className="input" placeholder="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} style={{ marginTop: 8 }} rows={2} />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button className="btn btn-sm" onClick={() => updateStatus(statusId)}>Simpan</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setStatusId(null); setCatatan(""); }}>Batal</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
