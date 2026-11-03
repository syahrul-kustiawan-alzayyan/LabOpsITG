"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon, IconName } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";
import { labDisplayName, labRoom } from "@/lib/lab-label";

const MENU: { href: string; label: string; icon: IconName }[] = [
  { href: "/informasi/jadwal", label: "Jadwal Lab", icon: "calendar" },
  { href: "/informasi/peminjaman", label: "Peminjaman Lab", icon: "booking" },
  { href: "/informasi/kendala", label: "Pelaporan Kendala", icon: "issue" },
  { href: "/informasi/rekrutmen", label: "Rekrutmen", icon: "recruitment" },
];

export default function HomePage() {
  const [labs, setLabs] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/labs").then(setLabs).catch(() => {});
  }, []);

  const totalCapacity = useMemo(
    () => labs.reduce((sum, lab) => sum + (Number(lab.kapasitas) || 0), 0),
    [labs],
  );
  const activeLabs = labs.filter((lab) => lab.status === "AKTIF").length;

  return (
    <PublicShell>
      <header className="hero">
        <div>
          <p className="hero-eyebrow">Profil laboratorium · Ilmu Komputer ITG</p>
          <h1 className="hero-title">Laboratorium Ilmu Komputer Institut Teknologi Garut.</h1>
          <p className="hero-lead">
            Laboratorium Ilmu Komputer ITG mendukung kegiatan praktikum, penelitian, dan
            pengembangan kompetensi mahasiswa Program Studi Ilmu Komputer. Fasilitas laboratorium
            dikelola untuk memastikan kegiatan akademik berjalan tertib, aman, dan terawat.
          </p>
          <div className="hero-actions">
            <a href="#fasilitas" className="btn">
              <Icon name="lab" size={15} /> Lihat fasilitas
            </a>
            <a href="#menu" className="btn btn-secondary">
              Menu informasi
            </a>
          </div>
          <div className="hero-stats">
            <span>
              <strong>{labs.length}</strong> laboratorium
            </span>
            <span>
              <strong>{activeLabs}</strong> berstatus aktif
            </span>
            <span>
              <strong>{totalCapacity}</strong> total kapasitas
            </span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-head">
            <span>Identitas laboratorium</span>
            <span className="badge badge-success">Ilkom ITG</span>
          </div>
          <div className="hero-panel-body">
            <div className="identity-row">
              <span className="stat-label">Institusi</span>
              <span>Institut Teknologi Garut</span>
            </div>
            <div className="identity-row">
              <span className="stat-label">Program studi</span>
              <span>Ilmu Komputer</span>
            </div>
            <div className="identity-row">
              <span className="stat-label">Pengelola</span>
              <span>Laboratorium Ilmu Komputer</span>
            </div>
            <div className="identity-row">
              <span className="stat-label">Lokasi</span>
              <span>Kampus ITG, Garut</span>
            </div>
          </div>
        </div>
      </header>

      <section className="feature-band">
        <div className="section-head">
          <div>
            <h2 className="section-title">Tentang laboratorium</h2>
            <p className="section-note">
              Ruang belajar bersama untuk praktikum, tugas besar, dan kegiatan pengembangan
              kompetensi mahasiswa Ilmu Komputer.
            </p>
          </div>
        </div>
        <div className="info-grid">
          <article className="info-card">
            <span className="info-icon">
              <Icon name="lab" size={20} />
            </span>
            <h3>Fasilitas praktikum</h3>
            <p className="section-note" style={{ margin: 0 }}>
              Laboratorium digunakan untuk kegiatan praktikum mata kuliah Ilmu Komputer dengan
              perangkat komputer dan sarana pendukung yang dirawat secara berkala.
            </p>
          </article>
          <article className="info-card">
            <span className="info-icon">
              <Icon name="prodi" size={20} />
            </span>
            <h3>Pengembangan kompetensi</h3>
            <p className="section-note" style={{ margin: 0 }}>
              Selain praktikum, laboratorium menjadi tempat mahasiswa mengerjakan tugas, penelitian,
              dan kegiatan pengembangan keterampilan di bidang komputasi.
            </p>
          </article>
        </div>
      </section>

      <section id="fasilitas" className="feature-band" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Fasilitas laboratorium</h2>
            <p className="section-note">
              Daftar laboratorium yang dikelola Program Studi Ilmu Komputer ITG.
            </p>
          </div>
        </div>

        {labs.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Icon name="lab" size={24} />
              <p className="empty-title">Data laboratorium belum tersedia</p>
              <p className="empty-text">Informasi fasilitas akan tampil di sini.</p>
            </div>
          </div>
        ) : (
          <div className="lab-grid">
            {labs.map((lab) => (
              <article className="card" key={lab.id}>
                <div className="card-head">
                  <div>
                    <h3 className="card-title">{labDisplayName(lab.nama, lab.kode)}</h3>
                    <p className="card-note">{lab.kode}</p>
                  </div>
                  <span className={`badge ${lab.status === "AKTIF" ? "badge-success" : "badge-muted"}`}>
                    {lab.status === "AKTIF" ? "Aktif" : lab.status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div className="stat-label">Lokasi</div>
                    <div style={{ fontSize: 15 }}>Ruang {labRoom(lab.nama, lab.lokasi)}</div>
                  </div>
                  <div>
                    <div className="stat-label">Kapasitas</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 15 }}>
                      {lab.kapasitas} orang
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="menu" className="feature-band" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Menu informasi</h2>
            <p className="section-note">
              Informasi operasional laboratorium tersedia di halaman terpisah.
            </p>
          </div>
        </div>
        <div className="menu-grid">
          {MENU.map((item) => (
            <Link key={item.href} href={item.href} className="menu-card">
              <span className="info-icon">
                <Icon name={item.icon} size={18} />
              </span>
              <span>{item.label}</span>
              <Icon name="chevron" size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="feature-band" style={{ paddingTop: 0 }}>
        <div className="contact-card">
          <span className="info-icon">
            <Icon name="prodi" size={20} />
          </span>
          <div>
            <h3>Kontak &amp; lokasi</h3>
            <p>
              Gedung Ilmu Komputer, Institut Teknologi Garut
              <br />
              Jl. Mayor Syamsu No. 1, Jayaraga, Tarogong Kidul, Garut, Jawa Barat 44151
            </p>
            <p className="info-hint">
              Untuk layanan laboratorium, gunakan menu informasi di atas.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
