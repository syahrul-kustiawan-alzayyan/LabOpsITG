"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";
import { CopyCode } from "@/components/CopyCode";
import { labDisplayName, labRoom } from "@/lib/lab-label";

const STEPS = [
  { n: "01", title: "Pilih lab dan slot", desc: "Tentukan laboratorium, tanggal, serta jam mulai dan selesai pemakaian." },
  { n: "02", title: "Kirim pengajuan", desc: "Isi keperluan dan data kontak. Sistem memeriksa bentrok dengan jadwal praktikum." },
  { n: "03", title: "Simpan kode pengajuan", desc: "Kode dan email dipakai untuk memantau status tanpa perlu masuk." },
  { n: "04", title: "Tunggu persetujuan", desc: "Koordinator laboratorium meninjau pengajuan dan memberi keputusan." },
];

const STATUS_LABEL: Record<string, string> = {
  DIAJUKAN: "Menunggu peninjauan",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
  SELESAI: "Selesai",
};
const STATUS_BADGE: Record<string, string> = {
  DIAJUKAN: "badge-warning",
  DISETUJUI: "badge-success",
  DITOLAK: "badge-danger",
  DIBATALKAN: "badge-muted",
  SELESAI: "badge-info",
};

const EMPTY = {
  labId: "",
  tanggal: "",
  jamMulai: "08:00",
  jamSelesai: "10:00",
  keperluan: "",
  jumlahPeserta: "",
  kebutuhanKhusus: "",
  namaPeminjam: "",
  nim: "",
  emailPeminjam: "",
  noWhatsapp: "",
};

type BookingStatus = {
  kodePengajuan: string;
  status: string;
  lab?: { kode: string; nama: string; lokasi: string } | null;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  keperluan: string;
  jumlahPeserta?: number | null;
  kebutuhanKhusus?: string | null;
  alasanKeputusan?: string | null;
  namaPeminjam?: string | null;
  createdAt: string;
  updatedAt: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PeminjamanInfoPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [availability, setAvailability] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ kodePengajuan: string; keperluan: string; tanggal: string } | null>(null);

  const [statusKode, setStatusKode] = useState("");
  const [statusEmail, setStatusEmail] = useState("");
  const [statusResult, setStatusResult] = useState<BookingStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [minTanggal, setMinTanggal] = useState("");

  useEffect(() => {
    setMinTanggal(new Date().toISOString().slice(0, 10));
    api<any[]>("/labs").then(setLabs).catch(() => setLabs([]));
  }, []);

  useEffect(() => {
    if (!form.labId || !form.tanggal) {
      setAvailability(null);
      return;
    }
    let alive = true;
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const q = new URLSearchParams({
          labId: form.labId,
          tanggal: form.tanggal,
          jamMulai: form.jamMulai,
          jamSelesai: form.jamSelesai,
        });
        const res = await api<{ ok: boolean; reason?: string }>(`/public/bookings/availability?${q}`, {}, false);
        if (alive) setAvailability(res);
      } catch {
        if (alive) setAvailability(null);
      } finally {
        if (alive) setChecking(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [form.labId, form.tanggal, form.jamMulai, form.jamSelesai]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (availability && !availability.ok) {
      setMsg({ type: "danger", text: availability.reason || "Slot tidak tersedia." });
      return;
    }
    setSubmitting(true);
    try {
      const body: any = { ...form };
      if (body.jumlahPeserta) body.jumlahPeserta = Number(body.jumlahPeserta);
      else delete body.jumlahPeserta;
      if (!body.kebutuhanKhusus) delete body.kebutuhanKhusus;
      if (!body.noWhatsapp) delete body.noWhatsapp;
      if (!body.nim) delete body.nim;
      const res = await api<{ kodePengajuan: string; keperluan: string; tanggal: string }>(
        "/public/bookings",
        { method: "POST", body },
        false,
      );
      setCreated(res);
      setStatusKode(res.kodePengajuan);
      setStatusEmail(form.emailPeminjam);
      setStatusResult(null);
      setStatusError("");
      setForm({ ...EMPTY, labId: form.labId });
      setAvailability(null);
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
      const res = await api<BookingStatus>(
        `/public/bookings/status/${encodeURIComponent(statusKode.trim())}?${q}`,
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
              Peminjaman laboratorium
            </h1>
            <p className="section-note">
              Ajukan pemakaian lab di luar jadwal praktikum. Tidak perlu masuk — cukup isi data dan
              simpan kode pengajuan untuk memantau status.
            </p>
          </div>
        </div>

        {created && (
          <div className="card" style={{ marginBottom: 18, borderColor: "var(--ok-050)" }}>
            <div className="card-head" style={{ marginBottom: 10 }}>
              <div>
                <span className="badge badge-success">
                  <Icon name="check" size={13} /> Pengajuan terkirim
                </span>
                <h2 className="card-title" style={{ marginTop: 8 }}>
                  Simpan kode pengajuan Anda
                </h2>
                <p className="card-note">
                  Gunakan kode ini bersama email yang dicantumkan untuk memeriksa status kapan saja.
                </p>
              </div>
            </div>
            <CopyCode code={created.kodePengajuan} />
          </div>
        )}

        <div className="split">
          <div className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Formulir pengajuan</h2>
                <p className="card-note">
                  Slot dicek otomatis terhadap jadwal praktikum dan peminjaman yang sudah disetujui.
                </p>
              </div>
              <span className="badge badge-plain">tanpa akun</span>
            </div>

            <form onSubmit={submit} className="form-grid">
              <div className="field">
                <label htmlFor="p-lab">Laboratorium</label>
                <select
                  id="p-lab"
                  value={form.labId}
                  onChange={(e) => setForm({ ...form, labId: e.target.value })}
                  required
                >
                  <option value="">Pilih laboratorium</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.kode} — {labDisplayName(l.nama, l.kode)} ({labRoom(l.nama, l.lokasi)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="p-tanggal">Tanggal</label>
                  <input
                    id="p-tanggal"
                    className="input"
                    type="date"
                    min={minTanggal}
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-mulai">Jam mulai</label>
                  <input
                    id="p-mulai"
                    className="input"
                    type="time"
                    value={form.jamMulai}
                    onChange={(e) => setForm({ ...form, jamMulai: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-selesai">Jam selesai</label>
                  <input
                    id="p-selesai"
                    className="input"
                    type="time"
                    value={form.jamSelesai}
                    onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })}
                    required
                  />
                </div>
              </div>

              {checking && <p className="field-hint" style={{ margin: 0 }}>Memeriksa ketersediaan slot…</p>}
              {!checking && availability && (
                <div className={`alert ${availability.ok ? "alert-success" : "alert-danger"}`} style={{ margin: 0 }}>
                  {availability.ok ? "Slot tersedia dan dapat diajukan." : availability.reason}
                </div>
              )}

              <div className="field">
                <label htmlFor="p-keperluan">Keperluan</label>
                <input
                  id="p-keperluan"
                  className="input"
                  placeholder="Contoh: pengerjaan tugas besar mata kuliah Basis Data"
                  value={form.keperluan}
                  onChange={(e) => setForm({ ...form, keperluan: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="p-peserta">Jumlah peserta</label>
                  <input
                    id="p-peserta"
                    className="input"
                    type="number"
                    min={1}
                    value={form.jumlahPeserta}
                    onChange={(e) => setForm({ ...form, jumlahPeserta: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-khusus">Kebutuhan khusus</label>
                  <input
                    id="p-khusus"
                    className="input"
                    placeholder="Opsional, mis. proyektor"
                    value={form.kebutuhanKhusus}
                    onChange={(e) => setForm({ ...form, kebutuhanKhusus: e.target.value })}
                  />
                </div>
              </div>

              <h3 className="form-section-title">Data peminjam</h3>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="p-nama">Nama lengkap</label>
                  <input
                    id="p-nama"
                    className="input"
                    value={form.namaPeminjam}
                    onChange={(e) => setForm({ ...form, namaPeminjam: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-nim">NIM</label>
                  <input
                    id="p-nim"
                    className="input"
                    value={form.nim}
                    onChange={(e) => setForm({ ...form, nim: e.target.value })}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="p-email">Email</label>
                  <input
                    id="p-email"
                    className="input"
                    type="email"
                    value={form.emailPeminjam}
                    onChange={(e) => setForm({ ...form, emailPeminjam: e.target.value })}
                    required
                  />
                  <span className="field-hint">Dipakai untuk memeriksa status pengajuan.</span>
                </div>
                <div className="field">
                  <label htmlFor="p-wa">WhatsApp</label>
                  <input
                    id="p-wa"
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
                <button className="btn" type="submit" disabled={submitting || availability?.ok === false}>
                  <Icon name="booking" size={15} /> {submitting ? "Mengirim…" : "Kirim pengajuan"}
                </button>
                <p className="field-hint" style={{ marginTop: 8 }}>
                  Dengan mengirim, Anda menyetujui penggunaan data untuk keperluan peminjaman lab.
                </p>
              </div>
            </form>
          </div>

          <div>
            <div className="card">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Cek status pengajuan</h2>
                  <p className="card-note">Masukkan kode pengajuan dan email yang Anda gunakan.</p>
                </div>
                <Icon name="search" size={18} />
              </div>

              <form onSubmit={checkStatus} className="form-grid">
                <div className="field">
                  <label htmlFor="s-kode">Kode pengajuan</label>
                  <input
                    id="s-kode"
                    className="input"
                    placeholder="PJM-XXXXXX-XXXXXX"
                    value={statusKode}
                    onChange={(e) => setStatusKode(e.target.value.toUpperCase())}
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
                    <code className="code-value">{statusResult.kodePengajuan}</code>
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
                      <dt>Jadwal</dt>
                      <dd>
                        {fmtDate(statusResult.tanggal)} · {statusResult.jamMulai}–{statusResult.jamSelesai}
                      </dd>
                    </div>
                    <div>
                      <dt>Keperluan</dt>
                      <dd>{statusResult.keperluan}</dd>
                    </div>
                    <div>
                      <dt>Peserta</dt>
                      <dd>{statusResult.jumlahPeserta || "-"} orang</dd>
                    </div>
                  </dl>
                  {statusResult.alasanKeputusan && (
                    <div className="alert alert-danger" style={{ marginTop: 10 }}>
                      Catatan koordinator: {statusResult.alasanKeputusan}
                    </div>
                  )}
                  <p className="field-hint" style={{ marginTop: 10 }}>
                    Status terakhir diperbarui {new Date(statusResult.updatedAt).toLocaleString("id-ID")}.
                  </p>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="card-title">Sebelum mengajukan</h2>
              <p className="section-note" style={{ margin: "6px 0 12px" }}>
                Periksa jadwal laboratorium agar pengajuan tidak bertabrakan dengan kegiatan praktikum.
              </p>
              <Link href="/informasi/jadwal" className="btn btn-secondary btn-sm">
                <Icon name="calendar" size={15} /> Lihat jadwal laboratorium
              </Link>
            </div>
          </div>
        </div>

        <div className="feature-grid cols-4" style={{ marginTop: 22, marginBottom: 18 }}>
          {STEPS.map((step) => (
            <article className="feature" key={step.n}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, color: "var(--petrol-600)", marginBottom: 8 }}>
                {step.n}
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>

        <div className="info-grid">
          <article className="info-card">
            <span className="info-icon">
              <Icon name="booking" size={20} />
            </span>
            <h3>Ketentuan pengajuan</h3>
            <ul className="info-list">
              <li>
                <Icon name="check" size={15} /> Pengajuan dapat dikirim tanpa akun kampus.
              </li>
              <li>
                <Icon name="check" size={15} /> Slot yang bentrok dengan jadwal praktikum atau peminjaman lain tidak dapat diajukan.
              </li>
              <li>
                <Icon name="check" size={15} /> Persetujuan diberikan oleh koordinator laboratorium.
              </li>
              <li>
                <Icon name="check" size={15} /> Simpan kode pengajuan untuk memantau status dan catatan koordinator.
              </li>
            </ul>
          </article>

          <article className="info-card">
            <span className="info-icon">
              <Icon name="clock" size={20} />
            </span>
            <h3>Setelah disetujui</h3>
            <p className="section-note" style={{ margin: 0 }}>
              Gunakan laboratorium sesuai slot yang disetujui, jaga fasilitas bersama, dan laporkan
              bila menemukan kerusakan melalui halaman pelaporan kendala.
            </p>
            <div className="info-cta">
              <Link href="/informasi/kendala" className="btn btn-secondary">
                <Icon name="issue" size={15} /> Laporkan kendala
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
