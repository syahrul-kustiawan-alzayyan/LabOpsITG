"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, fileUrl, uploadFile, withPeriode, getSelectedPeriodeId } from "@/lib/api";
import { Icon } from "@/components/Icon";

const STATUS = ["DIAJUKAN", "DIPROSES", "WAWANCARA", "DITERIMA", "DITOLAK", "CADANGAN"];
const STATUS_LABEL: Record<string, string> = {
  DIAJUKAN: "Diajukan",
  DIPROSES: "Diproses",
  WAWANCARA: "Wawancara",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
  CADANGAN: "Cadangan",
  DIBUKA: "Dibuka",
  DITUTUP: "Ditutup",
};
const STATUS_BADGE: Record<string, string> = {
  DIAJUKAN: "badge-warning",
  DIPROSES: "badge-info",
  WAWANCARA: "badge-info",
  DITERIMA: "badge-success",
  DITOLAK: "badge-danger",
  CADANGAN: "badge-muted",
  DIBUKA: "badge-success",
  DITUTUP: "badge-muted",
};

const EMPTY_PERIOD = { tipe: "ASISTEN_DOSEN", mataKuliah: "", kuota: 3, persyaratan: "", tenggat: "" };
const EMPTY_APPLY = { periodId: "", mataKuliahDilamar: "", motivasi: "", nilai: "", ketersediaan: "", cvUrl: "", transkripUrl: "" };

const APPLICANT_TYPE: Record<string, string> = {
  INSTRUKTUR: "Instruktur",
  ASISTEN_DOSEN: "Asisten Dosen",
};

function applicantName(a: any) {
  return a.pelamar?.nama || a.namaLengkap || "Pelamar";
}

function applicantEmail(a: any) {
  return a.pelamar?.email || a.emailKontak || "—";
}

export default function RecruitmentPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [tab, setTab] = useState<"periods" | "apply" | "mine" | "manage">("periods");
  const [periodForm, setPeriodForm] = useState<any>(EMPTY_PERIOD);
  const [applyForm, setApplyForm] = useState<any>(EMPTY_APPLY);
  const [statusApp, setStatusApp] = useState<any>(null);
  const [statusVal, setStatusVal] = useState("DIPROSES");
  const [catatan, setCatatan] = useState("");
  const [uploading, setUploading] = useState("");
  const [loading, setLoading] = useState(true);

  const isCoord = me && ["COORDINATOR", "ADMIN_SYSTEM"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const per = withPeriode({});
      const periodsUrl = "/recruitment/periods" + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const appsUrl = "/recruitment/applications" + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const [p, m] = await Promise.all([api<any[]>(periodsUrl), api<{ user: any }>("/auth/me")]);
      setPeriods(p);
      setMe(m.user);
      const mineRes = await api<any[]>("/recruitment/applications/mine").catch(() => []);
      setMine(mineRes);
      if (["COORDINATOR", "ADMIN_SYSTEM", "KAPRODI"].includes(m.user.role)) {
        setApplications(await api<any[]>(appsUrl).catch(() => []));
      }
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [getSelectedPeriodeId()]);

  useEffect(() => {
    load();
  }, [load]);

  // Muat ulang rekrutmen saat periode diganti dari sidebar
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("labops:periode-changed", handler);
    return () => window.removeEventListener("labops:periode-changed", handler);
  }, [load]);

  // Tautan langsung dari dasbor koordinator: /recruitment?tab=kelola
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested === "kelola" || requested === "manage") setTab("manage");
    else if (requested === "lama" || requested === "mine") setTab("mine");
    else if (requested === "lamar" || requested === "apply") setTab("apply");
  }, []);

  const openPeriods = useMemo(() => periods.filter((p) => p.status === "DIBUKA" && new Date(p.tenggat) >= new Date(new Date().toDateString())), [periods]);
  const pendingApps = applications.filter((a) => ["DIAJUKAN", "DIPROSES", "WAWANCARA"].includes(a.status));

  function pickPeriod(periodId: string) {
    const p = periods.find((x) => x.id === periodId);
    setApplyForm((prev: any) => ({ ...prev, periodId, mataKuliahDilamar: p?.mataKuliah || prev.mataKuliahDilamar }));
  }

  async function createPeriod(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/recruitment/periods", { method: "POST", body: { ...periodForm, kuota: Number(periodForm.kuota) } });
      setMsg({ type: "success", text: "Periode rekrutmen dibuka." });
      setPeriodForm(EMPTY_PERIOD);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const body: any = { ...applyForm };
      if (body.nilai) body.nilai = Number(body.nilai);
      if (!body.cvUrl) delete body.cvUrl;
      if (!body.transkripUrl) delete body.transkripUrl;
      await api("/recruitment/applications", { method: "POST", body });
      setMsg({ type: "success", text: "Lamaran terkirim. Pantau statusnya di tab Lamaran Saya." });
      setApplyForm(EMPTY_APPLY);
      setTab("mine");
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function onFile(kind: "cvUrl" | "transkripUrl", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind);
    setMsg(null);
    try {
      const res = await uploadFile(file);
      setApplyForm((prev: any) => ({ ...prev, [kind]: res.url }));
      setMsg({ type: "success", text: "Berkas terunggah." });
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setUploading("");
      e.target.value = "";
    }
  }

  async function saveStatus() {
    if (!statusApp) return;
    try {
      await api(`/recruitment/applications/${statusApp.id}/status`, { method: "PATCH", body: { status: statusVal, catatan } });
      setMsg({ type: "success", text: `Status lamaran ${applicantName(statusApp)} diperbarui.` });
      setStatusApp(null);
      setCatatan("");
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function closePeriod(p: any) {
    if (!window.confirm(`Tutup periode ${p.posisi} — ${p.mataKuliah}?`)) return;
    try {
      await api(`/recruitment/periods/${p.id}/close`, { method: "PATCH" });
      setMsg({ type: "success", text: "Periode ditutup." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rekrutmen Asisten</h1>
          <p className="page-subtitle">Periode, lamaran, dan tahapan seleksi instruktur serta asisten dosen.</p>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} role="status">
          {msg.text}
        </div>
      )}

      <div className="ops-strip reveal">
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="recruitment" size={14} /> Periode dibuka
          </span>
          <span className="ops-stat-value">{openPeriods.length}</span>
          <span className="ops-stat-note">dari {periods.length} periode</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="users" size={14} /> Total pelamar
          </span>
          <span className="ops-stat-value">{periods.reduce((sum, p) => sum + (p._count?.applications || 0), 0)}</span>
          <span className="ops-stat-note">seluruh periode</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="clock" size={14} /> Lamaran saya
          </span>
          <span className="ops-stat-value">{mine.length}</span>
          <span className="ops-stat-note">{mine.filter((a) => ["DITERIMA", "DITOLAK"].includes(a.status)).length} sudah final</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="issue" size={14} /> Perlu diproses
          </span>
          <span className="ops-stat-value">{isCoord ? pendingApps.length : "—"}</span>
          <span className="ops-stat-note">{isCoord ? "lamaran menunggu keputusan" : "khusus pengelola"}</span>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {([
          ["periods", "Periode"],
          ["apply", "Lamar"],
          ["mine", "Lamaran saya"],
          ...(isCoord ? [["manage", "Kelola"] as [string, string]] : []),
        ] as [string, string][]).map(([value, label]) => (
          <button key={value} type="button" className={`chip ${tab === value ? "is-active" : ""}`} onClick={() => setTab(value as any)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "periods" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {loading ? (
            <div className="card">
              <div className="skeleton" style={{ width: "40%" }} />
              <div className="skeleton" style={{ width: "80%", marginTop: 10 }} />
            </div>
          ) : periods.length === 0 ? (
            <div className="card">
              <div className="empty">
                <Icon name="recruitment" size={24} />
                <p className="empty-title">Belum ada periode rekrutmen</p>
                <p className="empty-text">Koordinator dapat membuka periode baru dari tab Kelola.</p>
              </div>
            </div>
          ) : (
            periods.map((p) => {
              const closed = p.status !== "DIBUKA";
              const remaining = Math.ceil((new Date(p.tenggat).getTime() - Date.now()) / 86400000);
              return (
                <article className="card" key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="card-head" style={{ marginBottom: 0 }}>
                    <div>
                      <h2 className="card-title">{p.posisi}</h2>
                      <p className="card-note">{p.mataKuliah}</p>
                    </div>
                    <span className={`badge ${STATUS_BADGE[p.status] || "badge-muted"}`}>{STATUS_LABEL[p.status] || p.status}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div className="stat-label">Kuota</div>
                      <div style={{ fontFamily: "var(--font-mono)" }}>{p.kuota} asisten</div>
                    </div>
                    <div>
                      <div className="stat-label">Pelamar</div>
                      <div style={{ fontFamily: "var(--font-mono)" }}>{p._count?.applications ?? 0}</div>
                    </div>
                    <div>
                      <div className="stat-label">Tenggat</div>
                      <div style={{ fontSize: 15.5 }}>{new Date(p.tenggat).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</div>
                    </div>
                    <div>
                      <div className="stat-label">Sisa waktu</div>
                      <div style={{ fontSize: 15.5, color: !closed && remaining <= 3 ? "var(--signal)" : undefined }}>
                        {closed ? "ditutup" : remaining >= 0 ? `${remaining} hari` : "lewat tenggat"}
                      </div>
                    </div>
                  </div>
                  {p.persyaratan && <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: 0 }}>{p.persyaratan}</p>}
                  {!closed && (
                    <button className="btn btn-sm" style={{ marginTop: "auto" }} onClick={() => { setTab("apply"); pickPeriod(p.id); }}>
                      <Icon name="recruitment" size={14} /> Lamar posisi ini
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {tab === "apply" && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Formulir lamaran</h2>
              <p className="card-note">Hanya periode berstatus dibuka dan belum lewat tenggat yang dapat dilamar.</p>
            </div>
            <span className="badge badge-plain">{openPeriods.length} periode tersedia</span>
          </div>
          {openPeriods.length === 0 ? (
            <div className="empty">
              <Icon name="clock" size={24} />
              <p className="empty-title">Belum ada periode terbuka</p>
              <p className="empty-text">Tunggu pengumuman rekrutmen berikutnya.</p>
            </div>
          ) : (
            <form onSubmit={apply} className="form-grid">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="rec-period">Periode</label>
                  <select id="rec-period" value={applyForm.periodId} onChange={(e) => pickPeriod(e.target.value)} required>
                    <option value="">Pilih periode</option>
                    {openPeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.posisi} — {p.mataKuliah}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rec-mk">Mata kuliah dilamar</label>
                  <input id="rec-mk" className="input" value={applyForm.mataKuliahDilamar} onChange={(e) => setApplyForm({ ...applyForm, mataKuliahDilamar: e.target.value })} required />
                </div>
                <div className="field">
                  <label htmlFor="rec-nilai">IPK / nilai</label>
                  <input id="rec-nilai" className="input" type="number" step="0.01" min={0} max={4} placeholder="3.45" value={applyForm.nilai} onChange={(e) => setApplyForm({ ...applyForm, nilai: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="rec-waktu">Ketersediaan waktu</label>
                  <input id="rec-waktu" className="input" placeholder="Senin–Kamis, 13.00–17.00" value={applyForm.ketersediaan} onChange={(e) => setApplyForm({ ...applyForm, ketersediaan: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="rec-motivasi">Motivasi</label>
                <textarea id="rec-motivasi" rows={3} placeholder="Mengapa Anda ingin menjadi asisten dosen?" value={applyForm.motivasi} onChange={(e) => setApplyForm({ ...applyForm, motivasi: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="rec-cv">CV (PDF, opsional)</label>
                  <input id="rec-cv" className="input" type="file" accept="application/pdf" onChange={(e) => onFile("cvUrl", e)} disabled={uploading === "cvUrl"} />
                  {applyForm.cvUrl && (
                    <a href={fileUrl(applyForm.cvUrl)} target="_blank" rel="noreferrer" className="field-hint">
                      CV terunggah — buka berkas
                    </a>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="rec-transkrip">Transkrip nilai (PDF, opsional)</label>
                  <input id="rec-transkrip" className="input" type="file" accept="application/pdf" onChange={(e) => onFile("transkripUrl", e)} disabled={uploading === "transkripUrl"} />
                  {applyForm.transkripUrl && (
                    <a href={fileUrl(applyForm.transkripUrl)} target="_blank" rel="noreferrer" className="field-hint">
                      Transkrip terunggah — buka berkas
                    </a>
                  )}
                </div>
              </div>
              <div>
                <button className="btn" type="submit" disabled={!!uploading || !applyForm.periodId}>
                  <Icon name="recruitment" size={15} /> Kirim lamaran
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Posisi</th>
                <th>Mata kuliah</th>
                <th>Status</th>
                <th>Catatan</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {mine.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <Icon name="recruitment" size={24} />
                      <p className="empty-title">Belum ada lamaran</p>
                      <p className="empty-text">Lamaran yang dikirim akan tampil di sini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                mine.map((a) => (
                  <tr key={a.id}>
                    <td>{a.period?.posisi}</td>
                    <td>{a.mataKuliahDilamar}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[a.status] || "badge-muted"}`}>{STATUS_LABEL[a.status] || a.status}</span>
                    </td>
                    <td style={{ fontSize: 15 }}>{a.catatanPenilaian || "—"}</td>
                    <td className="num" style={{ fontSize: 14.5 }}>
                      {new Date(a.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "manage" && isCoord && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <h2 className="card-title">Buka periode rekrutmen</h2>
                <p className="card-note">Lowongan dibuka per jenis rekrutmen dan mata kuliah praktikum.</p>
              </div>
            </div>
            <form onSubmit={createPeriod} className="form-grid">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="np-tipe">Jenis rekrutmen</label>
                  <select
                    id="np-tipe"
                    value={periodForm.tipe}
                    onChange={(e) => setPeriodForm({ ...periodForm, tipe: e.target.value })}
                    required
                  >
                    <option value="ASISTEN_DOSEN">Asisten Dosen</option>
                    <option value="INSTRUKTUR">Instruktur</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="np-mk">Mata kuliah</label>
                  <input id="np-mk" className="input" placeholder="Praktikum Basis Data" value={periodForm.mataKuliah} onChange={(e) => setPeriodForm({ ...periodForm, mataKuliah: e.target.value })} required />
                </div>
                <div className="field">
                  <label htmlFor="np-kuota">Kuota</label>
                  <input id="np-kuota" className="input" type="number" min={1} value={periodForm.kuota} onChange={(e) => setPeriodForm({ ...periodForm, kuota: e.target.value })} required />
                </div>
                <div className="field">
                  <label htmlFor="np-tenggat">Tenggat</label>
                  <input id="np-tenggat" className="input" type="date" value={periodForm.tenggat} onChange={(e) => setPeriodForm({ ...periodForm, tenggat: e.target.value })} required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="np-syarat">Persyaratan</label>
                <textarea id="np-syarat" rows={2} placeholder="Mahasiswa aktif semester 3 ke atas, IPK minimal 3.0." value={periodForm.persyaratan} onChange={(e) => setPeriodForm({ ...periodForm, persyaratan: e.target.value })} />
              </div>
              <div>
                <button className="btn" type="submit">
                  Buka periode
                </button>
              </div>
            </form>
          </div>

          <div className="card card-flush" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <h2 className="card-title">Kelola periode ({periods.length})</h2>
            </div>
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Posisi</th>
                    <th>Mata kuliah</th>
                    <th>Pelamar</th>
                    <th>Tenggat</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id}>
                      <td>{p.posisi}</td>
                      <td>{p.mataKuliah}</td>
                      <td className="num">{p._count?.applications ?? 0}</td>
                      <td className="num">{new Date(p.tenggat).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[p.status] || "badge-muted"}`}>{STATUS_LABEL[p.status] || p.status}</span>
                      </td>
                      <td>
                        {p.status === "DIBUKA" && (
                          <button className="btn btn-danger btn-sm" onClick={() => closePeriod(p)}>
                            Tutup
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card card-flush">
            <div className="card-head">
              <div>
                <h2 className="card-title">Kelola lamaran ({applications.length})</h2>
                <p className="card-note">{pendingApps.length} lamaran belum final.</p>
              </div>
            </div>
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Pelamar</th>
                    <th>Posisi</th>
                    <th>MK dilamar</th>
                    <th>Berkas</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty" style={{ padding: 24 }}>
                          <p className="empty-text">Belum ada lamaran masuk.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    applications.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 550 }}>{applicantName(a)}</div>
                          <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{applicantEmail(a)}</div>
                          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span className={`badge ${a.pelamarId ? "badge-info" : "badge-warning"}`}>
                              {a.pelamarId ? "Akun kampus" : APPLICANT_TYPE[a.tipe] || "Publik"}
                            </span>
                            {a.nim && <span className="num">NIM {a.nim}</span>}
                            {a.gelar && <span>{a.gelar}</span>}
                            {a.noWhatsapp && <span className="num">WA {a.noWhatsapp}</span>}
                          </div>
                        </td>
                        <td>{a.period?.posisi}</td>
                        <td>
                          <div>{a.mataKuliahDilamar}</div>
                          {a.nilai != null && (
                            <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>Nilai/IPK {a.nilai}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
                            {a.suratLamaranUrl ? (
                              <a href={fileUrl(a.suratLamaranUrl)} target="_blank" rel="noreferrer">
                                Surat lamaran
                              </a>
                            ) : (
                              <span style={{ color: "var(--ink-soft)" }}>Surat lamaran —</span>
                            )}
                            {a.cvUrl ? (
                              <a href={fileUrl(a.cvUrl)} target="_blank" rel="noreferrer">
                                CV
                              </a>
                            ) : (
                              <span style={{ color: "var(--ink-soft)" }}>CV —</span>
                            )}
                            {a.transkripUrl ? (
                              <a href={fileUrl(a.transkripUrl)} target="_blank" rel="noreferrer">
                                Transkrip nilai
                              </a>
                            ) : (
                              <span style={{ color: "var(--ink-soft)" }}>Transkrip —</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[a.status] || "badge-muted"}`}>{STATUS_LABEL[a.status] || a.status}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setStatusApp(a);
                              setStatusVal(a.status);
                              setCatatan(a.catatanPenilaian || "");
                            }}
                          >
                            Ubah status
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {statusApp && (
            <div className="panel reveal">
              <div className="card-head">
                <div>
                  <h3 className="panel-title" style={{ margin: 0 }}>
                    Keputusan lamaran · {applicantName(statusApp)}
                  </h3>
                  <p className="card-note">Status Diterima otomatis menambahkan sub-peran asisten/instruktur.</p>
                </div>
                <button className="icon-btn" onClick={() => setStatusApp(null)} aria-label="Tutup">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="as-status">Status</label>
                  <select id="as-status" value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 2 }}>
                  <label htmlFor="as-catatan">Catatan penilaian</label>
                  <input id="as-catatan" className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Ringkasan hasil seleksi atau jadwal wawancara" />
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button className="btn" onClick={saveStatus}>
                  Simpan keputusan
                </button>
                <button className="btn btn-secondary" onClick={() => setStatusApp(null)}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
