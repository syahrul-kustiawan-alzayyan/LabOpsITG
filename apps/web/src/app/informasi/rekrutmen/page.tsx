"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fileUrl, uploadPublicFile } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";

type OpenPeriod = {
  id: string;
  posisi: string;
  tipe: "INSTRUKTUR" | "ASISTEN_DOSEN";
  mataKuliah: string;
  kuota: number;
  persyaratan?: string | null;
  tenggat: string;
  _count?: { applications: number };
};

const APPLICANT_TYPE: Record<string, string> = {
  INSTRUKTUR: "Instruktur",
  ASISTEN_DOSEN: "Asisten Dosen",
};

const EMPTY_FORM = {
  periodId: "",
  tipe: "ASISTEN_DOSEN",
  namaLengkap: "",
  emailKontak: "",
  nim: "",
  gelar: "",
  noWhatsapp: "",
  mataKuliahDilamar: "",
  suratLamaranUrl: "",
  cvUrl: "",
  transkripUrl: "",
  pernyataan: false,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function RekrutmenInfoPage() {
  const [periods, setPeriods] = useState<OpenPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<OpenPeriod | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: string; text: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  function loadPeriods() {
    setPeriodsLoading(true);
    api<OpenPeriod[]>("/public/recruitment/periods", {}, false)
      .then((data) => setPeriods(Array.isArray(data) ? data : []))
      .catch(() => setPeriods([]))
      .finally(() => setPeriodsLoading(false));
  }

  function selectPeriod(period: OpenPeriod) {
    setSelectedPeriod(period);
    setForm({
      ...EMPTY_FORM,
      periodId: period.id,
      tipe: period.tipe,
      mataKuliahDilamar: period.mataKuliah,
    });
    setFormMsg(null);
    setSuccessMsg(null);
    if (typeof document !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("lamar")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  function clearSelection() {
    setSelectedPeriod(null);
    setForm({ ...EMPTY_FORM });
    setFormMsg(null);
    if (typeof document !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("rekrutmen")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  async function onFile(key: "suratLamaranUrl" | "cvUrl" | "transkripUrl", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(key);
    setFormMsg(null);
    try {
      const res = await uploadPublicFile(file);
      setForm((prev) => ({ ...prev, [key]: res.url }));
      setFormMsg({ type: "success", text: `Berkas ${file.name} berhasil diunggah.` });
    } catch (err: any) {
      setFormMsg({ type: "danger", text: err.message });
    } finally {
      setUploading("");
      e.target.value = "";
    }
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    if (!form.pernyataan) {
      setFormMsg({ type: "danger", text: "Centang pernyataan kebenaran data sebelum mengirim." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ message: string }>(
        "/public/recruitment/applications",
        { method: "POST", body: form },
        false,
      );
      setSuccessMsg(`${res.message}. Kami akan menghubungi Anda melalui email atau WhatsApp yang dicantumkan.`);
      setForm({ ...EMPTY_FORM });
      setSelectedPeriod(null);
      setFormMsg(null);
      loadPeriods();
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document.getElementById("rekrutmen")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } catch (err: any) {
      setFormMsg({ type: "danger", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function uploadField(
    key: "suratLamaranUrl" | "cvUrl" | "transkripUrl",
    id: string,
    label: string,
  ) {
    const value = form[key];
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          className="input"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => onFile(key, e)}
          disabled={uploading === key}
        />
        {uploading === key && <span className="field-hint">Mengunggah berkas…</span>}
        {value && (
          <a href={fileUrl(value)} target="_blank" rel="noreferrer" className="field-hint">
            Berkas terunggah — buka berkas
          </a>
        )}
      </div>
    );
  }

  return (
    <PublicShell>
      <section id="rekrutmen" className="feature-band" style={{ paddingTop: 32 }}>
        <Link href="/" className="back-link">
          ← Kembali ke informasi laboratorium
        </Link>

        <div className="section-head" style={{ marginTop: 12 }}>
          <div>
            <p className="hero-eyebrow" style={{ marginBottom: 8 }}>
              Informasi laboratorium
            </p>
            <h1 className="page-title" style={{ margin: 0 }}>
              Rekrutmen instruktur &amp; asisten dosen
            </h1>
            <p className="section-note">
              Lowongan yang sedang dibuka untuk mahasiswa maupun umum. Pilih salah satu lowongan
              untuk membuka formulir lamaran.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="alert alert-success" role="status" style={{ marginBottom: 16 }}>
            {successMsg}
          </div>
        )}

        {periodsLoading ? (
          <div className="card">
            <div className="skeleton" style={{ width: "38%" }} />
            <div className="skeleton" style={{ width: "72%", marginTop: 10 }} />
          </div>
        ) : periods.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Icon name="recruitment" size={24} />
              <p className="empty-title">Belum ada lowongan yang dibuka</p>
              <p className="empty-text">
                Informasi rekrutmen instruktur atau asisten dosen akan tampil di sini ketika dibuka.
              </p>
            </div>
          </div>
        ) : !selectedPeriod ? (
          <>
            <div className="rec-grid">
              {periods.map((p) => (
                <article className="card rec-card" key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="card-head" style={{ marginBottom: 0 }}>
                    <div>
                      <h3 className="card-title">{p.posisi}</h3>
                      <p className="card-note">{p.mataKuliah}</p>
                    </div>
                    <span className="badge badge-success">Dibuka</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div className="stat-label">Kuota</div>
                      <div style={{ fontFamily: "var(--font-mono)" }}>{p.kuota} orang</div>
                    </div>
                    <div>
                      <div className="stat-label">Tenggat</div>
                      <div style={{ fontSize: 15 }}>{formatDate(p.tenggat)}</div>
                    </div>
                  </div>
                  {p.persyaratan && (
                    <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: 0 }}>{p.persyaratan}</p>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginTop: "auto" }}
                    onClick={() => selectPeriod(p)}
                  >
                    <Icon name="recruitment" size={14} /> Lamar posisi ini
                  </button>
                </article>
              ))}
            </div>
            <p className="section-note" style={{ marginTop: 14 }}>
              Pilih salah satu lowongan di atas untuk membuka formulir lamaran.
            </p>
          </>
        ) : (
          <div id="lamar" className="card">
            <div className="selected-opening">
              <div>
                <span className="badge badge-success">Lowongan dipilih</span>
                <h2 className="card-title" style={{ marginTop: 8 }}>
                  {selectedPeriod.posisi} — {selectedPeriod.mataKuliah}
                </h2>
                <p className="card-note">
                  Tenggat {formatDate(selectedPeriod.tenggat)} · Kuota {selectedPeriod.kuota} orang
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearSelection}>
                ← Ganti lowongan
              </button>
            </div>

            <div className="card-head">
              <div>
                <h2 className="card-title">Formulir lamaran</h2>
                <p className="card-note">
                  Lengkapi data dan unggah surat lamaran, CV, serta transkrip nilai (PDF/gambar, maks. 10 MB).
                </p>
              </div>
            </div>

            {formMsg && (
              <div className={`alert alert-${formMsg.type}`} role="status" style={{ marginBottom: 14 }}>
                {formMsg.text}
              </div>
            )}

            <form onSubmit={submitApplication} className="form-grid">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="lamar-tipe">Jenis rekrutmen</label>
                  <input
                    id="lamar-tipe"
                    className="input"
                    value={APPLICANT_TYPE[form.tipe] || form.tipe}
                    readOnly
                  />
                  <span className="field-hint">Mengikuti lowongan yang dipilih.</span>
                </div>
                <div className="field">
                  <label htmlFor="lamar-nama">Nama lengkap</label>
                  <input
                    id="lamar-nama"
                    className="input"
                    value={form.namaLengkap}
                    onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="lamar-email">Email</label>
                  <input
                    id="lamar-email"
                    className="input"
                    type="email"
                    value={form.emailKontak}
                    onChange={(e) => setForm({ ...form, emailKontak: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                {form.tipe === "ASISTEN_DOSEN" ? (
                  <div className="field">
                    <label htmlFor="lamar-nim">NIM</label>
                    <input
                      id="lamar-nim"
                      className="input"
                      value={form.nim}
                      onChange={(e) => setForm({ ...form, nim: e.target.value })}
                      placeholder="Nomor induk mahasiswa"
                      required
                    />
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="lamar-gelar">Gelar</label>
                    <input
                      id="lamar-gelar"
                      className="input"
                      value={form.gelar}
                      onChange={(e) => setForm({ ...form, gelar: e.target.value })}
                      placeholder="Contoh: S.Kom., M.Kom."
                      required
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="lamar-wa">No. WhatsApp</label>
                  <input
                    id="lamar-wa"
                    className="input"
                    type="tel"
                    value={form.noWhatsapp}
                    onChange={(e) => setForm({ ...form, noWhatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="lamar-mk">Mata kuliah praktikum</label>
                  <input
                    id="lamar-mk"
                    className="input"
                    value={form.mataKuliahDilamar}
                    readOnly
                    placeholder="Mengikuti lowongan yang dipilih"
                    required
                  />
                  <span className="field-hint">Mengikuti lowongan yang dipilih.</span>
                </div>
              </div>

              <div className="form-row">
                {uploadField("suratLamaranUrl", "lamar-surat", "Surat lamaran")}
                {uploadField("cvUrl", "lamar-cv", "CV")}
                {uploadField("transkripUrl", "lamar-transkrip", "Transkrip nilai")}
              </div>

              <label className="check-row" htmlFor="lamar-pernyataan">
                <input
                  id="lamar-pernyataan"
                  type="checkbox"
                  checked={form.pernyataan}
                  onChange={(e) => setForm({ ...form, pernyataan: e.target.checked })}
                  required
                />
                <span>
                  Saya menyatakan bahwa data yang dimasukkan benar dan siap menjalankan tugas sesuai
                  arahan dosen pengampu.
                </span>
              </label>

              <div>
                <button
                  className="btn"
                  type="submit"
                  disabled={submitting || !!uploading || !form.periodId}
                >
                  <Icon name="recruitment" size={15} />
                  {submitting ? "Mengirim lamaran…" : "Kirim lamaran"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
