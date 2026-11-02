"use client";
import { useEffect, useState } from "react";

const API = "http://localhost:4000";
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function LandingPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/labs`).then((r) => r.ok && r.json().then(setLabs)).catch(() => {});
    fetch(`${API}/schedules`).then((r) => r.ok && r.json().then(setSchedules)).catch(() => {});
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then(async (r) => { if (r.ok) setMe((await r.json()).user); })
      .catch(() => {});
  }, []);

  const filtered = filterLab ? schedules.filter((s) => s.labId === filterLab) : schedules;
  const grouped: Record<number, any[]> = {};
  for (const s of filtered) { if (!grouped[s.hari]) grouped[s.hari] = []; grouped[s.hari].push(s); }

  const features = [
    { icon: "📅", title: "Jadwal Lab", desc: "Lihat jadwal penggunaan lab per hari, per lab, dan per mata kuliah secara real-time." },
    { icon: "📋", title: "Peminjaman Lab", desc: "Ajukan peminjaman lab di luar jadwal praktikum dan pantau statusnya." },
    { icon: "🛠️", title: "Lapor Kendala", desc: "Laporkan kerusakan PC, jaringan, AC, proyektor dengan foto dan tiket." },
    { icon: "🎯", title: "Rekrutmen", desc: "Daftar sebagai Instruktur atau Asisten Dosen pada periode rekrutmen." },
    { icon: "✅", title: "Absensi", desc: "Absensi praktikum via scan QR code di lab dengan validasi waktu." },
    { icon: "📦", title: "Inventaris", desc: "Data inventaris lab terhubung dengan laporan kendala." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "#fff", padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div className="logo" style={{ width: 48, height: 48, fontSize: 22 }}>L</div>
            <div>
              <div style={{ fontSize: 13, opacity: .7, letterSpacing: ".08em", textTransform: "uppercase" }}>Institut Teknologi Garut</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Jurusan Ilmu Komputer</div>
            </div>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.15 }}>
            Sistem Informasi Operasional<br />Laboratorium Ilmu Komputer
          </h1>
          <p style={{ fontSize: 16, opacity: .85, maxWidth: 640, margin: "0 0 24px" }}>
            LabOps menggantikan proses manual (chat, spreadsheet, formulir kertas) dengan satu alur kerja
            yang tercatat, dapat dilacak, dan dapat dilaporkan — untuk jadwal, peminjaman, kendala,
            rekrutmen, absensi, dan inventaris.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {me ? (
              <a href="/dashboard" className="btn" style={{ background: "#fff", color: "#1e3a8a" }}>Masuk ke Dasbor</a>
            ) : (
              <>
                <a href="/login" className="btn" style={{ background: "#fff", color: "#1e3a8a" }}>Masuk</a>
                <a href="#jadwal" className="btn btn-secondary" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>Lihat Jadwal</a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 20px" }}>Fitur Utama</h2>
        <div className="stat-grid">
          {features.map((f) => (
            <div className="card" key={f.title}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Public schedule */}
      <section id="jadwal" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>
        <div className="page-header">
          <div>
            <h2 className="page-title">Jadwal Penggunaan Lab</h2>
            <p className="page-subtitle">Jadwal praktikum semester 2026/2027 Ganjil (read-only). Masuk untuk mengajukan peminjaman.</p>
          </div>
          <select className="input" style={{ width: 260 }} value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
            <option value="">Semua lab</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.kode} - {l.nama}</option>)}
          </select>
        </div>

        {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((h, i) => {
          const items = grouped[i] || [];
          if (items.length === 0) return null;
          return (
            <div className="card" key={i} style={{ marginBottom: 16 }}>
              <h3 className="card-title">{h}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Lab</th><th>Mata Kuliah</th><th>Kelas</th><th>Jam</th><th>Pengampu</th></tr></thead>
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id}>
                        <td>{s.lab?.kode}</td>
                        <td>{s.mataKuliah}</td>
                        <td>{s.kelas}</td>
                        <td>{s.jamMulai}-{s.jamSelesai}</td>
                        <td>{s.pengampu?.nama || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card"><p style={{ color: "var(--text-muted)" }}>Belum ada jadwal.</p></div>
        )}
      </section>

      {/* CTA */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "32px 24px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px" }}>Ingin menggunakan lab?</h3>
        <p style={{ color: "var(--text-muted)", margin: "0 0 16px" }}>Masuk untuk mengajukan peminjaman, melaporkan kendala, dan mengakses fitur lainnya.</p>
        <a href="/login" className="btn">Masuk ke Sistem</a>
      </section>

      <footer style={{ padding: "16px 24px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
        © 2026 Laboratorium Ilmu Komputer — Institut Teknologi Garut
      </footer>
    </div>
  );
}
