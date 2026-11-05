"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, fileUrl, uploadFile } from "@/lib/api";
import { Icon } from "@/components/Icon";

const KATEGORI = [
  { value: "PERANGKAT", label: "Perangkat" },
  { value: "JARINGAN", label: "Jaringan" },
  { value: "LISTRIK", label: "Listrik" },
  { value: "PERANGKAT_LUNAK", label: "Perangkat lunak" },
  { value: "FASILITAS", label: "Fasilitas" },
  { value: "LAINNYA", label: "Lainnya" },
];
const URGENSI = [
  { value: "RENDAH", label: "Rendah", note: "tenggat 7 hari" },
  { value: "SEDANG", label: "Sedang", note: "tenggat 3 hari" },
  { value: "TINGGI", label: "Tinggi", note: "tenggat 1 hari" },
];
const STATUS = ["BARU", "DIVERIFIKASI", "DALAM_PENANGANAN", "SELESAI", "DITOLAK"];

const STATUS_LABEL: Record<string, string> = {
  BARU: "Baru",
  DIVERIFIKASI: "Diverifikasi",
  DALAM_PENANGANAN: "Ditangani",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};
const STATUS_BADGE: Record<string, string> = {
  BARU: "badge-warning",
  DIVERIFIKASI: "badge-info",
  DALAM_PENANGANAN: "badge-info",
  SELESAI: "badge-success",
  DITOLAK: "badge-danger",
};
const URGENSI_BADGE: Record<string, string> = {
  RENDAH: "badge-muted",
  SEDANG: "badge-warning",
  TINGGI: "badge-danger",
};

const EMPTY = { labId: "", itemId: "", kategori: "PERANGKAT", urgensi: "SEDANG", deskripsi: "", fotoUrls: [] as string[] };

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [filterUrgensi, setFilterUrgensi] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [pjId, setPjId] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCoord = me && ["COORDINATOR", "ADMIN_SYSTEM"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterLab) params.set("labId", filterLab);
      if (filterUrgensi) params.set("urgensi", filterUrgensi);
      const [list, labList, meRes] = await Promise.all([
        api<any[]>(`/issues?${params.toString()}`),
        api<any[]>("/labs"),
        api<{ user: any }>("/auth/me"),
      ]);
      setIssues(list);
      setLabs(labList);
      setMe(meRes.user);
      if (["COORDINATOR", "ADMIN_SYSTEM"].includes(meRes.user.role)) {
        const [inv, us] = await Promise.all([
          api<any[]>("/inventory").catch(() => []),
          api<any[]>("/users?pageSize=100").catch(() => []),
        ]);
        setItems(inv);
        setUsers(us);
      }
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterLab, filterUrgensi]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter(
      (i) =>
        i.nomorTiket?.toLowerCase().includes(q) ||
        i.deskripsi?.toLowerCase().includes(q) ||
        i.lab?.kode?.toLowerCase().includes(q) ||
        i.pelapor?.nama?.toLowerCase().includes(q) ||
        i.namaPelapor?.toLowerCase().includes(q),
    );
  }, [issues, search]);

  const counts = useMemo(() => {
    const open = issues.filter((i) => !["SELESAI", "DITOLAK"].includes(i.status));
    const overdue = open.filter((i) => i.dueAt && new Date(i.dueAt) < new Date(new Date().toDateString()));
    const high = open.filter((i) => i.urgensi === "TINGGI");
    return { total: issues.length, open: open.length, overdue: overdue.length, high: high.length };
  }, [issues]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const body: any = { labId: form.labId, kategori: form.kategori, urgensi: form.urgensi, deskripsi: form.deskripsi };
      if (form.itemId) body.itemId = form.itemId;
      if (form.fotoUrls.length) body.fotoUrls = form.fotoUrls;
      const created = await api<any>("/issues", { method: "POST", body });
      setMsg({ type: "success", text: `Tiket ${created.nomorTiket} dibuat. Koordinator akan memverifikasi.` });
      setForm({ ...EMPTY, labId: form.labId, itemId: form.itemId });
      setShowForm(false);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await uploadFile(file);
      setForm((prev: any) => ({ ...prev, fotoUrls: [...prev.fotoUrls, res.url] }));
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      setDetail(await api<any>(`/issues/${id}`));
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setDetailLoading(false);
    }
  }

  async function verify(id: string) {
    if (!pjId) {
      setMsg({ type: "danger", text: "Pilih penanggung jawab terlebih dahulu." });
      return;
    }
    try {
      await api(`/issues/${id}/verify`, { method: "PATCH", body: { penanggungJawabId: pjId, catatan: "Diverifikasi koordinator" } });
      setVerifyId(null);
      setPjId("");
      setMsg({ type: "success", text: "Tiket diverifikasi dan penanggung jawab diberi tahu." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api(`/issues/${id}/status`, { method: "PATCH", body: { status, catatan: "" } });
      setMsg({ type: "success", text: `Status tiket diubah menjadi ${STATUS_LABEL[status] || status}.` });
      if (detail?.id === id) openDetail(id);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function reopen(id: string) {
    try {
      await api(`/issues/${id}/reopen`, { method: "PATCH", body: { catatan: "Dibuka kembali oleh pelapor" } });
      setMsg({ type: "success", text: "Tiket dibuka kembali." });
      if (detail?.id === id) openDetail(id);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  function nextAction(iss: any) {
    if (!isCoord) return null;
    if (iss.status === "BARU") return { label: "Verifikasi", run: () => setVerifyId(iss.id) };
    if (iss.status === "DIVERIFIKASI") return { label: "Mulai tangani", run: () => updateStatus(iss.id, "DALAM_PENANGANAN") };
    if (iss.status === "DALAM_PENANGANAN") return { label: "Tandai selesai", run: () => updateStatus(iss.id, "SELESAI") };
    return null;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kendala Lab</h1>
          <p className="page-subtitle">
            Setiap laporan menjadi tiket bernomor dengan penanggung jawab, riwayat status, dan tenggat penanganan.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? "close" : "plus"} size={16} /> {showForm ? "Tutup form" : "Lapor kendala"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} role="status">
          {msg.text}
        </div>
      )}

      <div className="ops-strip reveal">
        <div className={`ops-stat ${counts.overdue ? "is-danger" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="issue" size={14} /> Tiket terbuka
          </span>
          <span className="ops-stat-value">{counts.open}</span>
          <span className="ops-stat-note">dari {counts.total} tiket pada tampilan</span>
        </div>
        <div className={`ops-stat ${counts.overdue ? "is-danger" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="clock" size={14} /> Melewati SLA
          </span>
          <span className="ops-stat-value">{counts.overdue}</span>
          <span className="ops-stat-note">perlu ditindaklanjuti hari ini</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="alert" size={14} /> Urgensi tinggi
          </span>
          <span className="ops-stat-value">{counts.high}</span>
          <span className="ops-stat-note">tiket terbuka</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="check" size={14} /> Selesai
          </span>
          <span className="ops-stat-value">{issues.filter((i) => i.status === "SELESAI").length}</span>
          <span className="ops-stat-note">pada tampilan ini</span>
        </div>
      </div>

      {showForm && (
        <div className="card reveal" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h2 className="card-title">Laporan baru</h2>
              <p className="card-note">Sertakan lokasi dan gejala yang terlihat agar penanganan lebih cepat.</p>
            </div>
            <span className="badge badge-plain">tiket otomatis</span>
          </div>
          <form onSubmit={create} className="form-grid">
            <div className="form-row">
              <div className="field">
                <label htmlFor="i-lab">Lab</label>
                <select id="i-lab" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value, itemId: "" })} required>
                  <option value="">Pilih lab</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.kode} — {l.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="i-kategori">Kategori</label>
                <select id="i-kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                  {KATEGORI.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="i-urgensi">Urgensi</label>
                <select id="i-urgensi" value={form.urgensi} onChange={(e) => setForm({ ...form, urgensi: e.target.value })}>
                  {URGENSI.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label} — {u.note}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isCoord && (
              <div className="field">
                <label htmlFor="i-item">Item inventaris terkait (opsional)</label>
                <select id="i-item" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
                  <option value="">Tidak terkait item tertentu</option>
                  {items
                    .filter((it) => !form.labId || it.labId === form.labId)
                    .map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.kodeAset} — {it.nama}
                      </option>
                    ))}
                </select>
                <p className="field-hint">Item yang dipilih akan ditandai rusak dan tertaut ke tiket ini.</p>
              </div>
            )}

            <div className="field">
              <label htmlFor="i-deskripsi">Deskripsi kendala</label>
              <textarea
                id="i-deskripsi"
                rows={3}
                placeholder="Contoh: PC nomor 12 tidak menyala setelah listrik padam. Lampu indikator depan mati."
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="i-foto">Foto pendukung (opsional)</label>
              <input id="i-foto" className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} disabled={uploading} />
              <p className="field-hint">{uploading ? "Mengunggah…" : "PNG, JPG, atau WEBP. Maksimal 10 MB."}</p>
              {form.fotoUrls.length > 0 && (
                <div className="chip-row">
                  {form.fotoUrls.map((url: string) => (
                    <span key={url} className="chip">
                      <Icon name="check" size={12} /> {url.split("/").pop()}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: 20, padding: "0 2px" }}
                        onClick={() => setForm((prev: any) => ({ ...prev, fotoUrls: prev.fotoUrls.filter((u: string) => u !== url) }))}
                        aria-label="Hapus foto"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button className="btn" type="submit" disabled={uploading}>
                <Icon name="issue" size={15} /> Kirim laporan
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 220px", minWidth: 200 }}>
            <label htmlFor="i-search">Cari</label>
            <div style={{ position: "relative" }}>
              <input
                id="i-search"
                className="input"
                placeholder="Nomor tiket, lab, pelapor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
              <span style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }}>
                <Icon name="search" size={15} />
              </span>
            </div>
          </div>
          <div className="field" style={{ minWidth: 170 }}>
            <label htmlFor="i-filter-lab">Lab</label>
            <select id="i-filter-lab" value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
              <option value="">Semua lab</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.kode}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 170 }}>
            <label htmlFor="i-filter-urgensi">Urgensi</label>
            <select id="i-filter-urgensi" value={filterUrgensi} onChange={(e) => setFilterUrgensi(e.target.value)}>
              <option value="">Semua urgensi</option>
              {URGENSI.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="chip-row" style={{ marginTop: 12 }}>
          <button type="button" className={`chip ${filterStatus === "" ? "is-active" : ""}`} onClick={() => setFilterStatus("")}>
            Semua
          </button>
          {STATUS.map((s) => (
            <button type="button" key={s} className={`chip ${filterStatus === s ? "is-active" : ""}`} onClick={() => setFilterStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tiket</th>
              <th>Kendala</th>
              <th>Lab</th>
              <th>Urgensi</th>
              <th>Status</th>
              <th>Tenggat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="skeleton" style={{ height: 32 }} />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <Icon name="check" size={24} />
                    <p className="empty-title">Tidak ada tiket pada filter ini</p>
                    <p className="empty-text">Ubah filter atau buat laporan kendala baru.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((iss) => {
                const overdue = iss.dueAt && !["SELESAI", "DITOLAK"].includes(iss.status) && new Date(iss.dueAt) < new Date(new Date().toDateString());
                const action = nextAction(iss);
                return (
                  <tr key={iss.id}>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, fontFamily: "var(--font-mono)" }} onClick={() => openDetail(iss.id)}>
                        {iss.nomorTiket}
                      </button>
                      <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                        {iss.pelapor?.nama || iss.namaPelapor || "-"}
                        {!iss.pelapor && iss.namaPelapor ? " · Publik" : ""}
                      </div>
                    </td>
                    <td style={{ maxWidth: 340 }}>
                      <div style={{ fontWeight: 500 }}>{iss.deskripsi}</div>
                      <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                        {KATEGORI.find((k) => k.value === iss.kategori)?.label || iss.kategori}
                        {iss.penanggungJawab?.nama ? ` · PJ ${iss.penanggungJawab.nama}` : ""}
                      </div>
                    </td>
                    <td className="num">{iss.lab?.kode}</td>
                    <td>
                      <span className={`badge ${URGENSI_BADGE[iss.urgensi] || "badge-muted"}`}>{iss.urgensi.toLowerCase()}</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[iss.status] || "badge-muted"}`}>{STATUS_LABEL[iss.status] || iss.status}</span>
                    </td>
                    <td className="num" style={{ color: overdue ? "var(--danger)" : undefined, fontWeight: overdue ? 600 : 400 }}>
                      {fmtDate(iss.dueAt)}
                      {overdue ? " · lewat" : ""}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openDetail(iss.id)}>
                          Detail
                        </button>
                        {action && (
                          <button className="btn btn-sm" onClick={action.run}>
                            {action.label}
                          </button>
                        )}
                        {!isCoord && iss.status === "SELESAI" && iss.pelapor?.email === me?.email && (
                          <button className="btn btn-secondary btn-sm" onClick={() => reopen(iss.id)}>
                            Buka kembali
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {verifyId && (
        <div className="panel" style={{ borderColor: "#e5bdb8", background: "var(--danger-050)" }}>
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Verifikasi tiket
              </h3>
              <p className="card-note">Tentukan penanggung jawab agar tiket masuk ke daftar kerja.</p>
            </div>
            <button className="icon-btn" onClick={() => { setVerifyId(null); setPjId(""); }} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="input" style={{ maxWidth: 320 }} value={pjId} onChange={(e) => setPjId(e.target.value)}>
              <option value="">Pilih penanggung jawab</option>
              {users
                .filter((u) => ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} — {u.role}
                  </option>
                ))}
            </select>
            <button className="btn" onClick={() => verify(verifyId)} disabled={!pjId}>
              Verifikasi
            </button>
          </div>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="panel reveal">
          {detailLoading && !detail ? (
            <div className="skeleton" style={{ height: 60 }} />
          ) : (
            <>
              <div className="card-head">
                <div>
                  <h3 className="panel-title" style={{ margin: 0 }}>
                    {detail.nomorTiket} · {detail.deskripsi}
                  </h3>
                  <p className="card-note">
                    {detail.lab?.kode} · {detail.pelapor?.nama || detail.namaPelapor || "Pelapor publik"} · dibuat {fmtDate(detail.createdAt)} · tenggat {fmtDate(detail.dueAt)}
                  </p>
                  {!detail.pelapor && detail.namaPelapor && (
                    <p className="card-note">
                      Kontak publik: {detail.emailPelapor || "-"}
                      {detail.noWhatsapp ? ` · ${detail.noWhatsapp}` : ""}
                      {detail.nim ? ` · NIM ${detail.nim}` : ""}
                    </p>
                  )}
                </div>
                <button className="icon-btn" onClick={() => setDetail(null)} aria-label="Tutup detail">
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div className="form-row" style={{ marginBottom: 14 }}>
                <div>
                  <div className="stat-label">Status</div>
                  <span className={`badge ${STATUS_BADGE[detail.status] || "badge-muted"}`}>{STATUS_LABEL[detail.status] || detail.status}</span>
                </div>
                <div>
                  <div className="stat-label">Urgensi</div>
                  <span className={`badge ${URGENSI_BADGE[detail.urgensi] || "badge-muted"}`}>{detail.urgensi.toLowerCase()}</span>
                </div>
                <div>
                  <div className="stat-label">Penanggung jawab</div>
                  <div style={{ fontSize: 15.5 }}>{detail.penanggungJawab?.nama || "belum ditugaskan"}</div>
                </div>
                <div>
                  <div className="stat-label">Item inventaris</div>
                  <div style={{ fontSize: 15.5 }}>{detail.item ? `${detail.item.kodeAset} — ${detail.item.nama}` : "—"}</div>
                </div>
              </div>

              {detail.fotoUrls?.length > 0 && (
                <div className="chip-row" style={{ marginBottom: 14 }}>
                  {detail.fotoUrls.map((url: string) => (
                    <a key={url} href={fileUrl(url)} target="_blank" rel="noreferrer" className="chip">
                      <Icon name="external" size={13} /> Lampiran
                    </a>
                  ))}
                </div>
              )}

              <h4 style={{ fontSize: 15.5, margin: "0 0 8px" }}>Riwayat</h4>
              <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                {(detail.history || []).map((h: any) => (
                  <li key={h.id} style={{ fontSize: 15 }}>
                    <strong>{STATUS_LABEL[h.status] || h.status}</strong> · {h.actorNama || "Sistem"}
                    <span style={{ display: "block", color: "var(--ink-soft)", fontSize: 14 }}>
                      {new Date(h.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {h.catatan ? ` — ${h.catatan}` : ""}
                    </span>
                  </li>
                ))}
                {(detail.history || []).length === 0 && <li style={{ fontSize: 15, color: "var(--ink-soft)" }}>Belum ada riwayat.</li>}
              </ol>

              <div className="table-actions" style={{ marginTop: 14 }}>
                {isCoord && detail.status === "BARU" && (
                  <button className="btn btn-sm" onClick={() => { setVerifyId(detail.id); setDetail(null); }}>
                    Verifikasi
                  </button>
                )}
                {isCoord && detail.status === "DIVERIFIKASI" && (
                  <button className="btn btn-sm" onClick={() => updateStatus(detail.id, "DALAM_PENANGANAN")}>
                    Mulai tangani
                  </button>
                )}
                {isCoord && detail.status === "DALAM_PENANGANAN" && (
                  <button className="btn btn-sm" onClick={() => updateStatus(detail.id, "SELESAI")}>
                    Tandai selesai
                  </button>
                )}
                {detail.status === "SELESAI" && detail.pelapor?.email === me?.email && (
                  <button className="btn btn-secondary btn-sm" onClick={() => reopen(detail.id)}>
                    Buka kembali
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
