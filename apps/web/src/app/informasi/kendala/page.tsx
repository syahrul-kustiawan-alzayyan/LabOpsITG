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

const EMPTY = {
  labId: "",
  kategori: "PERANGKAT",
  deskripsi: "",
  namaPelapor: "",
  nim: "",
};

function fmtDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KendalaInfoPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ nomorTiket: string; createdAt: string } | null>(null);

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
      if (fotoUrls.length) body.fotoUrls = fotoUrls;
      const res = await api<{ nomorTiket: string; createdAt: string }>(
        "/public/issues",
        { method: "POST", body },
        false,
      );
      setCreated(res);
      setForm({ ...EMPTY, labId: form.labId });
      setFotoUrls([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setSubmitting(false);
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
              masuk — cukup isi nama dan NIM, waktu pelaporan tercatat otomatis.
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
                  Laporan Anda sudah masuk
                </h2>
                <p className="card-note">
                  Waktu pelaporan tercatat otomatis: <strong>{fmtDateTime(created.createdAt)}</strong>.
                  Koordinator laboratorium akan menindaklanjuti laporan ini.
                </p>
              </div>
            </div>
            <CopyCode code={created.nomorTiket} label="Nomor tiket (referensi)" />
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
                <span className="field-hint">Minimal 10 karakter. Sebutkan lokasi/nomor unit bila ada.</span>
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
                    placeholder="Nomor induk mahasiswa"
                    required
                  />
                </div>
              </div>

              <div className="auto-time">
                <Icon name="clock" size={15} />
                <span>
                  Waktu pelaporan diisi otomatis oleh sistem saat laporan dikirim.
                </span>
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
              <h2 className="card-title">Alur penanganan</h2>
              <ul className="info-list" style={{ marginTop: 10 }}>
                <li>
                  <Icon name="check" size={15} /> Laporan tercatat dengan nomor tiket dan waktu pelaporan otomatis.
                </li>
                <li>
                  <Icon name="check" size={15} /> Koordinator memverifikasi laporan dan menetapkan penanggung jawab.
                </li>
                <li>
                  <Icon name="check" size={15} /> Penanganan dilakukan sesuai tingkat kebutuhan dan dampak kendala.
                </li>
                <li>
                  <Icon name="check" size={15} /> Untuk kondisi mendesak, hubungi pengelola laboratorium secara langsung.
                </li>
              </ul>
            </div>

            <div className="card">
              <h2 className="card-title">Setelah mengirim</h2>
              <p className="section-note" style={{ margin: "6px 0 12px" }}>
                Nomor tiket ditampilkan sebagai referensi. Tidak perlu membuat akun atau memeriksa
                status secara berkala.
              </p>
              <Link href="/informasi/peminjaman" className="btn btn-secondary btn-sm">
                <Icon name="booking" size={15} /> Ajukan peminjaman
              </Link>
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
              hubungi pengelola laboratorium. Laporan tetap dapat dikirim melalui formulir ini.
            </p>
            <div className="info-cta">
              <Link href="/informasi/jadwal" className="btn btn-secondary">
                <Icon name="calendar" size={15} /> Lihat jadwal laboratorium
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
