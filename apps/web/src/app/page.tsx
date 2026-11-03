"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, fileUrl, uploadPublicFile } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { ScheduleGrid } from "@/components/ScheduleGrid";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type OpenPeriod = {
  id: string;
  posisi: string;
  mataKuliah: string;
  kuota: number;
  persyaratan?: string | null;
  tenggat: string;
  _count?: { applications: number };
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

export default function LandingPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [day, setDay] = useState<number>(new Date().getDay());
  const [me, setMe] = useState<any>(null);

  const [periods, setPeriods] = useState<OpenPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    api<any[]>("/labs").then(setLabs).catch(() => {});
    api<any[]>("/schedules").then(setSchedules).catch(() => {});
    // Jangan memaksa pengunjung anonim ke halaman login.
    api<{ user: any }>("/auth/me", {}, false)
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
    loadPeriods();
  }, []);

  function loadPeriods() {
    setPeriodsLoading(true);
    api<OpenPeriod[]>("/public/recruitment/periods", {}, false)
      .then((data) => setPeriods(Array.isArray(data) ? data : []))
      .catch(() => setPeriods([]))
      .finally(() => setPeriodsLoading(false));
  }

  const filtered = useMemo(
    () => (filterLab ? schedules.filter((s) => s.labId === filterLab) : schedules),
    [schedules, filterLab],
  );
  const daySessions = filtered.filter((s) => s.hari === day);
  const todaySessions = schedules.filter((s) => s.hari === new Date().getDay()).slice(0, 4);

  function pickPeriod(periodId: string) {
    const period = periods.find((p) => p.id === periodId);
    setForm((prev) => ({
      ...prev,
      periodId,
      mataKuliahDilamar: period?.mataKuliah || prev.mataKuliahDilamar,
    }));
  }

  function selectPeriod(period: OpenPeriod) {
    pickPeriod(period.id);
    setFormMsg(null);
    if (typeof document !== "undefined") {
      document.getElementById("lamar")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      setFormMsg({
        type: "success",
        text: `${res.message}. Kami akan menghubungi Anda melalui email atau WhatsApp yang dicantumkan.`,
      });
      setForm({ ...EMPTY_FORM });
      loadPeriods();
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
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand-inline">
          <span className="rail-mark">L</span>
          <span>
            <span className="brand-name">LabOps</span>
            <span className="brand-sub">Ilkom ITG</span>
          </span>
        </Link>
        <div className="landing-nav-links">
          <a href="#jadwal" className="landing-nav-link">
            Jadwal
          </a>
          <a href="#peminjaman" className="landing-nav-link">
            Peminjaman
          </a>
          <a href="#kendala" className="landing-nav-link">
            Kendala
          </a>
          <a href="#rekrutmen" className="landing-nav-link">
            Rekrutmen
          </a>
          {me ? (
            <Link href="/dashboard" className="btn btn-sm">
              Buka dasbor
            </Link>
          ) : (
            <Link href="/login" className="btn btn-sm">
              Masuk
            </Link>
          )}
        </div>
      </nav>

      <header className="hero">
        <div>
          <p className="hero-eyebrow">Informasi laboratorium · Ilmu Komputer ITG</p>
          <h1 className="hero-title">Jadwal, peminjaman, dan layanan lab dalam satu halaman.</h1>
          <p className="hero-lead">
            Laboratorium Ilmu Komputer Institut Teknologi Garut. Lihat jadwal praktikum yang tersedia,
            ajukan peminjaman di luar jadwal, laporkan kendala pelaksanaan laboratorium, dan ikuti
            rekrutmen instruktur atau asisten dosen bila dibuka.
          </p>
          <div className="hero-actions">
            <a href="#jadwal" className="btn">
              <Icon name="calendar" size={15} /> Lihat jadwal lab
            </a>
            <Link href="/bookings" className="btn btn-secondary">
              <Icon name="booking" size={15} /> Ajukan peminjaman
            </Link>
            <Link href="/issues" className="btn btn-secondary">
              <Icon name="issue" size={15} /> Laporkan kendala
            </Link>
          </div>
          <div className="hero-stats">
            <span>
              <strong>{labs.length}</strong> lab aktif
            </span>
            <span>
              <strong>{schedules.length}</strong> sesi terjadwal
            </span>
            <span>
              <strong>{periods.length}</strong> lowongan dibuka
            </span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-head">
            <span>Jadwal hari ini · {HARI[new Date().getDay()]}</span>
            <span className="badge badge-success">live</span>
          </div>
          <div className="hero-panel-body">
            {todaySessions.length === 0 ? (
              <div className="empty" style={{ padding: "20px 0" }}>
                <Icon name="calendar" size={22} />
                <p className="empty-title">Belum ada sesi hari ini</p>
                <p className="empty-text">Lab tersedia untuk diajukan.</p>
              </div>
            ) : (
              todaySessions.map((s) => (
                <div className="hero-session" key={s.id}>
                  <span className="hero-time">{s.jamMulai}</span>
                  <span>
                    <span className="hero-course">{s.mataKuliah}</span>
                    <span className="hero-room" style={{ display: "block" }}>
                      kelas {s.kelas}
                    </span>
                  </span>
                  <span className="hero-room">{s.lab?.kode}</span>
                </div>
              ))
            )}
          </div>
          <div className="popover-foot">
            <span>{schedules.length} sesi semester ini</span>
            <a href="#jadwal">Lihat semua</a>
          </div>
        </div>
      </header>

      <section id="jadwal" className="feature-band">
        <div className="section-head">
          <div>
            <h2 className="section-title">Jadwal lab yang tersedia</h2>
            <p className="section-note">
              Jadwal praktikum yang sedang berjalan. Slot di luar jadwal ini dapat diajukan melalui
              halaman peminjaman.
            </p>
          </div>
          <div className="field" style={{ minWidth: 240 }}>
            <label htmlFor="landing-lab">Filter lab</label>
            <select id="landing-lab" value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
              <option value="">Semua lab</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.kode} — {l.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="chip-row" style={{ marginBottom: 14 }}>
          {HARI.map((h, i) => (
            <button key={h} type="button" className={`chip ${day === i ? "is-active" : ""}`} onClick={() => setDay(i)}>
              {h}
            </button>
          ))}
        </div>

        <ScheduleGrid
          schedules={daySessions}
          labs={labs}
          emptyLabel={`Tidak ada sesi pada hari ${HARI[day]}`}
        />
      </section>

      <section id="peminjaman" className="feature-band" style={{ paddingTop: 0 }}>
        <div className="info-grid">
          <article className="info-card">
            <span className="info-icon">
              <Icon name="booking" size={20} />
            </span>
            <h3>Peminjaman laboratorium</h3>
            <p className="section-note" style={{ marginTop: 0 }}>
              Butuh lab di luar jadwal praktikum? Ajukan slot, lalu pantau keputusan koordinator.
            </p>
            <ul className="info-list">
              <li>
                <Icon name="check" size={15} /> Pilih lab, tanggal, dan jam pemakaian.
              </li>
              <li>
                <Icon name="check" size={15} /> Konflik dengan jadwal atau peminjaman lain dicegah otomatis.
              </li>
              <li>
                <Icon name="check" size={15} /> Satu persetujuan koordinator, status terlihat di dasbor.
              </li>
            </ul>
            <div className="info-cta">
              <Link href="/bookings" className="btn">
                <Icon name="booking" size={15} /> Buka halaman pengajuan
              </Link>
              <p className="info-hint">Anda akan diminta masuk dengan akun kampus.</p>
            </div>
          </article>

          <article id="kendala" className="info-card">
            <span className="info-icon">
              <Icon name="issue" size={20} />
            </span>
            <h3>Pelaporan kendala laboratorium</h3>
            <p className="section-note" style={{ marginTop: 0 }}>
              Laporkan kerusakan perangkat, jaringan, atau fasilitas lab agar ditindaklanjuti.
            </p>
            <ul className="info-list">
              <li>
                <Icon name="check" size={15} /> Setiap laporan mendapat nomor tiket dan riwayat status.
              </li>
              <li>
                <Icon name="check" size={15} /> Koordinator menetapkan penanggung jawab dan tenggat.
              </li>
              <li>
                <Icon name="check" size={15} /> Notifikasi in-app menjaga Anda tetap tahu perkembangannya.
              </li>
            </ul>
            <div className="info-cta">
              <Link href="/issues" className="btn">
                <Icon name="issue" size={15} /> Buka halaman pelaporan
              </Link>
              <p className="info-hint">Anda akan diminta masuk dengan akun kampus.</p>
            </div>
          </article>
        </div>
      </section>

      <section id="rekrutmen" className="feature-band" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Rekrutmen instruktur &amp; asisten dosen</h2>
            <p className="section-note">
              Lowongan yang sedang dibuka untuk mahasiswa maupun umum. Berkas lamaran diunggah
              langsung melalui formulir di bawah.
            </p>
          </div>
        </div>

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
        ) : (
          <>
            <div className="rec-grid" style={{ marginBottom: 18 }}>
              {periods.map((p) => (
                <article className="card" key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

            <div id="lamar" className="card">
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
                    <label htmlFor="lamar-posisi">Posisi yang dilamar</label>
                    <select
                      id="lamar-posisi"
                      value={form.periodId}
                      onChange={(e) => pickPeriod(e.target.value)}
                      required
                    >
                      <option value="">Pilih posisi</option>
                      {periods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.posisi} — {p.mataKuliah}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="lamar-tipe">Jenis rekrutmen</label>
                    <select
                      id="lamar-tipe"
                      value={form.tipe}
                      onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                      required
                    >
                      <option value="ASISTEN_DOSEN">Asisten Dosen</option>
                      <option value="INSTRUKTUR">Instruktur</option>
                    </select>
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
                      onChange={(e) => setForm({ ...form, mataKuliahDilamar: e.target.value })}
                      placeholder="Praktikum yang dilamar"
                      required
                    />
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
          </>
        )}
      </section>

      <footer className="landing-foot">
        <div className="landing-foot-inner">
          <span>© 2026 Laboratorium Ilmu Komputer · Institut Teknologi Garut</span>
          <span>LabOps · sistem operasional laboratorium</span>
        </div>
      </footer>
    </div>
  );
}
