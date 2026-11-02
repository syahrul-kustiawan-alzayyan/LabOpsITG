"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon, IconName } from "@/components/Icon";
import { ScheduleGrid } from "@/components/ScheduleGrid";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "calendar", title: "Jadwal yang bisa dipercaya", desc: "Peta pemakaian lab per jam, per kelas, per semester. Konflik dicegah sebelum disimpan." },
  { icon: "booking", title: "Peminjaman berjejak", desc: "Pengajuan, persetujuan, dan pembatalan tercatat lengkap dengan alasan keputusan." },
  { icon: "issue", title: "Kendala jadi tiket", desc: "Laporan kerusakan punya nomor, penanggung jawab, riwayat status, dan tenggat." },
  { icon: "attendance", title: "Absensi terverifikasi", desc: "QR per sesi dengan masa berlaku singkat, hanya untuk peserta yang terdaftar." },
  { icon: "inventory", title: "Aset terhubung", desc: "Inventaris per lab tersambung ke tiket kendala dan riwayat mutasi aset." },
  { icon: "recruitment", title: "Rekrutmen asisten", desc: "Periode rekrutmen, berkas lamaran, dan tahapan seleksi dalam satu alur." },
];

const STEPS = [
  { n: "01", title: "Lihat ketersediaan", desc: "Jadwal praktikum dan peminjaman disetujui tampil di peta lab yang sama." },
  { n: "02", title: "Ajukan atau laporkan", desc: "Masuk dengan akun institusi untuk mengajukan peminjaman atau membuat tiket kendala." },
  { n: "03", title: "Pantau keputusan", desc: "Notifikasi membawa status terbaru; koordinator memproses dari satu antrean." },
];

export default function LandingPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [day, setDay] = useState<number>(new Date().getDay());
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api<any[]>("/labs").then(setLabs).catch(() => {});
    api<any[]>("/schedules").then(setSchedules).catch(() => {});
    api<{ user: any }>("/auth/me").then((d) => setMe(d.user)).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (filterLab ? schedules.filter((s) => s.labId === filterLab) : schedules),
    [schedules, filterLab],
  );
  const daySessions = filtered.filter((s) => s.hari === day);
  const todaySessions = schedules.filter((s) => s.hari === new Date().getDay()).slice(0, 4);
  const courses = new Set(schedules.map((s) => s.mataKuliah)).size;

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="#jadwal" className="btn btn-ghost">
            Jadwal lab
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
          <p className="hero-eyebrow">Sistem informasi operasional · Ilmu Komputer ITG</p>
          <h1 className="hero-title">Laboratorium yang tercatat, bukan yang diingat.</h1>
          <p className="hero-lead">
            Jadwal, peminjaman, kendala, absensi, dan inventaris laboratorium berjalan dalam satu sistem.
            Mahasiswa dan dosen melihat informasi yang sama dengan koordinator — tanpa menebak ruang atau jam.
          </p>
          <div className="hero-actions">
            <Link href={me ? "/dashboard" : "/login"} className="btn">
              {me ? "Buka dasbor" : "Masuk dengan akun kampus"} <Icon name="chevron" size={15} />
            </Link>
            <a href="#jadwal" className="btn btn-secondary">
              Lihat jadwal publik
            </a>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 26, flexWrap: "wrap", fontSize: 12, color: "var(--ink-soft)" }}>
            <span>
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)" }}>{labs.length}</strong> lab aktif
            </span>
            <span>
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)" }}>{schedules.length}</strong> sesi terjadwal
            </span>
            <span>
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)" }}>{courses}</strong> mata kuliah
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

      <section className="feature-band">
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article className="feature" key={f.title}>
              <Icon name={f.icon} size={20} />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="jadwal" className="feature-band" style={{ paddingTop: 8 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Jadwal penggunaan lab</h2>
            <p className="section-note">Terbuka untuk umum. Masuk untuk mengajukan peminjaman di luar jadwal ini.</p>
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

      <section className="feature-band">
        <div className="section-head">
          <div>
            <h2 className="section-title">Alur kerja</h2>
            <p className="section-note">Tiga langkah yang sama untuk peminjaman, kendala, dan rekrutmen.</p>
          </div>
        </div>
        <div className="feature-grid">
          {STEPS.map((s) => (
            <article className="feature" key={s.n}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--petrol-600)", marginBottom: 8 }}>{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 28px 48px" }}>
        <div
          style={{
            background: "#0b2624",
            color: "#fff",
            borderRadius: "var(--radius-lg)",
            padding: "32px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 6px" }}>Butuh lab di luar jadwal praktikum?</h2>
            <p style={{ margin: 0, color: "#9fb6b0", fontSize: 13 }}>
              Masuk dengan akun kampus, pilih slot, dan pantau persetujuan koordinator.
            </p>
          </div>
          <Link href="/login" className="btn" style={{ background: "#f4f6f2", borderColor: "#f4f6f2", color: "#0b2624" }}>
            Masuk ke sistem <Icon name="chevron" size={15} />
          </Link>
        </div>
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
