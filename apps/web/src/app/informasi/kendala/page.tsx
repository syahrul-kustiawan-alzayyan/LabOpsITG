"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, uploadPublicFile } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";
import { CopyCode } from "@/components/CopyCode";
import { labDisplayName } from "@/lib/lab-label";

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

const STATUS_LABEL: Record<string, string> = {
  BARU: "Baru",
  DIVERIFIKASI: "Diverifikasi",
  DALAM_PENANGANAN: "Sedang ditangani",
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

const EMPTY = {
  labId: "",
  kategori: "PERANGKAT",
  urgensi: "SEDANG",
  deskripsi: "",
  namaPelapor: "",
  nim: "",
  emailPelapor: "",
  noWhatsapp: "",
};

type IssueStatus = {
  nomorTiket: string;
  status: string;
  kategori: string;
  urgensi: string;
  deskripsi: string;
  lab?: { kode: string; nama: string } | null;
  namaPelapor?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  history: { status: string; catatan?: string | null; createdAt: string }[];
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function KendalaInfoPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ nomorTiket: string; dueAt?: string | null } | null>(null);

  const [statusTiket, setStatusTiket] = useState("");
  const [statusEmail, setStatusEmail] = useState("");
  const [statusResult, setStatusResult] = useState<IssueStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    api<any[]>("/labs").then(setLabs).catch(() => setLabs([]));
  }, []);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotoUrls.length >= 4) {
      setMsg({ type: "danger", text: "Maksimal 4 foto pendukung." });
      e.target.value = "";
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const res = await uploadPublicFile(file);
      setFotoUrls((prev) => [...prev, res.url]);
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      const body: any = { ...form };
      if (!body.noWhatsapp) delete body.noWhatsapp;
      if (!body.nim) delete body.nim;
      if (fotoUrls.length) body.fotoUrls = fotoUrls;
      const res = await api<{ nomorTiket: string; dueAt?: string | null }>(
        "/public/issues",
        { method: "POST", body },
        false,
      );
      setCreated(res);
      setStatusTiket(res.nomorTiket);
      setStatusEmail(form.emailPelapor);
      setStatusResult(null);
      setStatusError("");
      setForm({ ...EMPTY, labId: form.labId });
      setFotoUrls([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function checkStatus(e: React.FormEvent) {
    e.preventDefault();
    setStatusError("");
    setStatusResult(null);
    setStatusLoading(true);
    try {
      const q = new URLSearchParams({ email: statusEmail });
      const res = await api<IssueStatus>(
        `/public/issues/status/${encodeURIComponent(statusTiket.trim())}?${q}`,
        {},
        false,
      );
      setStatusResult(res);
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <PublicShell>
      <section className="feature-band" style={{ paddingTop: 32 }}>
        <Link href="/" className="back-link">
          ← Kembali ke informasi laboratorium
        </Link>

        <div className="section-head" style={{ marginTop: 12 }}>
          <div>
            <p className="hero-eyebrow" style={{ marginBottom: 8 }}>
              Informasi laboratorium
            </p>
            <h1 className="page-title" style={{ margin: 0 }}>
              Pelaporan kendala laboratorium
            </h1>
            <p className="section-note">
              Laporkan kerusakan perangkat, gangguan jaringan, atau masalah fasilitas. Tidak perlu
              masuk — simpan nomor tiket untuk memantau penanganan.
            </p>
          </div>
        </div>

        {created && (
          <div className="card" style={{ marginBottom: 18, borderColor: "var(--ok-050)" }}>
            <div className="card-head" style={{ marginBottom: 10 }}>
              <div>
                <span className="badge badge-success">
                  <Icon name="check" size={13} /> Laporan diterima
                </span>
                <h2 className="card-title" style={{ marginTop: 8 }}>
                  Simpan nomor tiket Anda
                </h2>
                <p className="card-note">
                  Nomor tiket dan email dipakai untuk memeriksa status penanganan.
                  {created.dueAt ? ` Target penanganan: ${fmtDate(created.dueAt)}.` : ""}
                </p>
              </div>
            </div>
            <CopyCode code={created.nomorTiket} label="Nomor tiket" />
          </div>
        )}

        <div className="split">
          <div className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Formulir laporan</h2>
                <p className="card-note">
                  Sertakan lokasi dan gejala yang terlihat agar penanganan lebih cepat.
                </p>
              </div>
              <span className="badge badge-plain">tanpa akun</span>
            </div>

            <form onSubmit={submit} className="form-grid">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="k-lab">Laboratorium</label>
                  <select
                    id="k-lab"
                    value={form.labId}
                    onChange={(e) => setForm({ ...form, labId: e.target.value })}
                    required
                  >
                    <option value="">Pilih laboratorium</option>
                    {labs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.kode} — {labDisplayName(l.nama, l.kode)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="k-kategori">Kategori</label>
                  <select
                    id="k-kategori"
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  >
                    {KATEGORI.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="k-urgensi">Urgensi</label>
                  <select
                    id="k-urgensi"
                    value={form.urgensi}
                    onChange={(e) => setForm({ ...form, urgensi: e.target.value })}
                  >
                    {URGENSI.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label} — {u.note}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="k-deskripsi">Deskripsi kendala</label>
                <textarea
                  id="k-deskripsi"
                  rows={4}
                  placeholder="Contoh: PC nomor 12 tidak menyala setelah listrik padam. Lampu indikator depan mati."
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  required
                />
                <span className="field-hint">Minimal 10 karakter. Sebutkan lokasi/ nomor unit bila ada.</span>
              </div>

              <div className="field">
                <label htmlFor="k-foto">Foto pendukung (opsional)</label>
                <input
                  id="k-foto"
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onPhoto}
                  disabled={uploading}
                />
                <span className="field-hint">
                  {uploading ? "Mengunggah…" : "PNG, JPG, atau WEBP. Maksimal 4 foto, 10 MB per berkas."}
                </span>
                {fotoUrls.length > 0 && (
                  <div className="chip-row">
                    {fotoUrls.map((url) => (
                      <span key={url} className="chip">
                        <Icon name="check" size={12} /> {url.split("/").pop()}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ minHeight: 20, padding: "0 2px" }}
                          onClick={() => setFotoUrls((prev) => prev.filter((u) => u !== url))}
                          aria-label="Hapus foto"
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <h3 className="form-section-title">Data pelapor</h3>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="k-nama">Nama lengkap</label>
                  <input
                    id="k-nama"
                    className="input"
                    value={form.namaPelapor}
                    onChange={(e) => setForm({ ...form, namaPelapor: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="k-nim">NIM</label>
                  <input
                    id="k-nim"
                    className="input"
                    value={form.nim}
                    onChange={(e) => setForm({ ...form, nim: e.target.value })}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="k-email">Email</label>
                  <input
                    id="k-email"
                    className="input"
                    type="email"
                    value={form.emailPelapor}
                    onChange={(e) => setForm({ ...form, emailPelapor: e.target.value })}
                    required
                  />
                  <span className="field-hint">Dipakai untuk memeriksa status tiket.</span>
                </div>
                <div className="field">
                  <label htmlFor="k-wa">WhatsApp</label>
                  <input
                    id="k-wa"
                    className="input"
                    value={form.noWhatsapp}
                    onChange={(e) => setForm({ ...form, noWhatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              {msg && (
                <div className={`alert alert-${msg.type}`} role="status">
                  {msg.text}
                </div>
              )}

              <div>
                <button className="btn" type="submit" disabled={submitting || uploading}>
                  <Icon name="issue" size={15} /> {submitting ? "Mengirim…" : "Kirim laporan"}
                </button>
              </div>
            </form>
          </div>

          <div>
            <div className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Cek status tiket</h2>
                  <p className="card-note">Masukkan nomor tiket dan email pelapor.</p>
                </div>
                <Icon name="search" size={18} />
              </div>

              <form onSubmit={checkStatus} className="form-grid">
                <div className="field">
                  <label htmlFor="s-tiket">Nomor tiket</label>
                  <input
                    id="s-tiket"
                    className="input"
                    placeholder="KDL-XXXXXX-XXXX"
                    value={statusTiket}
                    onChange={(e) => setStatusTiket(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="s-email">Email</label>
                  <input
                    id="s-email"
                    className="input"
                    type="email"
                    value={statusEmail}
                    onChange={(e) => setStatusEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <button className="btn btn-secondary" type="submit" disabled={statusLoading}>
                    <Icon name="search" size={15} /> {statusLoading ? "Mencari…" : "Cek status"}
                  </button>
                </div>
              </form>

              {statusError && (
                <div className="alert alert-danger" role="status" style={{ marginTop: 12 }}>
                  {statusError}
                </div>
              )}

              {statusResult && (
                <div className="status-result">
                  <div className="status-result-head">
                    <code className="code-value">{statusResult.nomorTiket}</code>
                    <span className={`badge ${STATUS_BADGE[statusResult.status] || "badge-muted"}`}>
                      {STATUS_LABEL[statusResult.status] || statusResult.status}
                    </span>
                  </div>
                  <dl className="status-list">
                    <div>
                      <dt>Laboratorium</dt>
                      <dd>{statusResult.lab ? `${statusResult.lab.kode} — ${labDisplayName(statusResult.lab.nama, statusResult.lab.kode)}` : "-"}</dd>
                    </div>
                    <div>
                      <dt>Kategori</dt>
                      <dd>{KATEGORI.find((k) => k.value === statusResult.kategori)?.label || statusResult.kategori}</dd>
                    </div>
                    <div>
                      <dt>Urgensi</dt>
                      <dd>
                        <span className={`badge ${URGENSI_BADGE[statusResult.urgensi] || "badge-muted"}`}>
                          {statusResult.urgensi.toLowerCase()}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Target selesai</dt>
                      <dd>{fmtDate(statusResult.dueAt)}</dd>
                    </div>
                  </dl>
                  <p className="status-desc">{statusResult.deskripsi}</p>
                  {statusResult.history.length > 0 && (
                    <>
                      <span className="stat-label">Riwayat status</span>
                      <ol className="status-timeline">
                        {statusResult.history.map((h, index) => (
                          <li key={`${h.createdAt}-${index}`}>
                            <strong>{STATUS_LABEL[h.status] || h.status}</strong>
                            <span>
                              {new Date(h.createdAt).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {h.catatan && <em>{h.catatan}</em>}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="card-title">Alur penanganan</h2>
              <ul className="info-list" style={{ marginTop: 10 }}>
                <li>
                  <Icon name="check" size={15} /> Laporan mendapat nomor tiket dan tercatat dalam sistem.
                </li>
                <li>
                  <Icon name="check" size={15} /> Koordinator memverifikasi laporan dan menetapkan penanggung jawab.
                </li>
                <li>
                  <Icon name="check" size={15} /> Status penanganan dapat dipantau lewat nomor tiket.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="info-grid" style={{ marginTop: 22 }}>
          <article className="info-card">
            <span className="info-icon">
              <Icon name="issue" size={20} />
            </span>
            <h3>Yang dapat dilaporkan</h3>
            <ul className="info-list">
              <li>
                <Icon name="check" size={15} /> Komputer, monitor, atau perangkat keras yang tidak berfungsi.
              </li>
              <li>
                <Icon name="check" size={15} /> Gangguan jaringan dan koneksi internet laboratorium.
              </li>
              <li>
                <Icon name="check" size={15} /> Kerusakan meja, kursi, proyektor, atau fasilitas ruangan.
              </li>
              <li>
                <Icon name="check" size={15} /> Kondisi lain yang menghambat kegiatan praktikum.
              </li>
            </ul>
          </article>

          <article className="info-card">
            <span className="info-icon">
              <Icon name="shield" size={20} />
            </span>
            <h3>Perlu tindakan mendesak?</h3>
            <p className="section-note" style={{ margin: 0 }}>
              Untuk kondisi berbahaya (listrik, kebakaran, atau perangkat mengeluarkan asap), segera
              hubungi pengelola laboratorium dan pilih urgensi <strong>Tinggi</strong> pada laporan.
            </p>
            <div className="info-cta">
              <Link href="/informasi/peminjaman" className="btn btn-secondary">
                <Icon name="booking" size={15} /> Ajukan peminjaman
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
