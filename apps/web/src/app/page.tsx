"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon, IconName } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";
import { labDisplayName, labRoom } from "@/lib/lab-label";

const MENU: { href: string; label: string; detail: string; icon: IconName }[] = [
  { href: "/informasi/jadwal", label: "Jadwal Lab", detail: "Praktikum dan pemakaian ruang", icon: "calendar" },
  { href: "/informasi/peminjaman", label: "Peminjaman Lab", detail: "Ajukan pemakaian di luar jadwal", icon: "booking" },
  { href: "/informasi/kendala", label: "Pelaporan Kendala", detail: "Laporkan kerusakan fasilitas", icon: "issue" },
  { href: "/informasi/rekrutmen", label: "Rekrutmen", detail: "Instruktur dan asisten dosen", icon: "recruitment" },
];

const IDENTITY = [
  { label: "Institusi", value: "Institut Teknologi Garut" },
  { label: "Program studi", value: "Ilmu Komputer" },
  { label: "Pengelola", value: "Laboratorium Ilmu Komputer" },
  { label: "Lokasi", value: "Kampus ITG, Garut" },
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
      <header className="hero hero-home">
        <div className="hero-copy">
          <p className="hero-eyebrow">Profil laboratorium · Ilmu Komputer ITG</p>
          <h1 className="hero-title">Laboratorium Ilmu Komputer Institut Teknologi Garut.</h1>
          <p className="hero-lead">
            Laboratorium Ilmu Komputer ITG mendukung kegiatan praktikum, penelitian, dan
            pengembangan kompetensi mahasiswa Program Studi Ilmu Komputer. Fasilitas laboratorium
            dikelola untuk memastikan kegiatan akademik berjalan tertib, aman, dan terawat.
          </p>
          <div className="hero-actions">
            <a href="#fasilitas" className="btn">
              <Icon name="lab" size={17} /> Lihat fasilitas
            </a>
            <a href="#menu" className="btn btn-secondary">
              Menu informasi
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <strong>{labs.length}</strong>
              <span>laboratorium</span>
            </div>
            <div>
              <strong>{activeLabs}</strong>
              <span>berstatus aktif</span>
            </div>
            <div>
              <strong>{totalCapacity}</strong>
              <span>total kapasitas</span>
            </div>
          </div>
        </div>

        <figure className="hero-visual">
          <img
            src="/images/hero-lab.jpg"
            alt="Perangkat komputer dan mahasiswa yang bekerja bersama di laboratorium"
          />
          <figcaption className="hero-visual-caption">
            <span className="badge badge-success">Laboratorium aktif</span>
            <strong>Ruang praktikum &amp; kolaborasi</strong>
            <span>
              {labs.length > 0
                ? `${labs.length} laboratorium · ${totalCapacity} kursi praktikum`
                : "Komputer, jaringan, dan ruang belajar bersama"}
            </span>
          </figcaption>
        </figure>
      </header>

      <section className="feature-band" style={{ paddingTop: 0 }}>
        <div className="identity-band">
          {IDENTITY.map((item) => (
            <div className="identity-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="feature-band">
        <div className="about-split">
          <figure className="media-figure">
            <img
              src="/images/about-lab.jpg"
              alt="Mahasiswa bekerja bersama menggunakan komputer di ruang laboratorium"
            />
            <figcaption>Belajar, berdiskusi, dan mengerjakan proyek bersama.</figcaption>
          </figure>
          <div className="about-copy">
            <p className="hero-eyebrow">Tentang laboratorium</p>
            <h2 className="section-title">
              Tempat praktikum, riset, dan pengembangan kompetensi.
            </h2>
            <p className="section-note">
              Laboratorium Ilmu Komputer menjadi ruang belajar bersama bagi mahasiswa Program Studi
              Ilmu Komputer ITG. Selain untuk praktikum terjadwal, laboratorium digunakan untuk
              mengerjakan tugas besar, penelitian, dan kegiatan pengembangan keterampilan di bidang
              komputasi.
            </p>
            <ul className="info-list info-list-lg">
              <li>
                <Icon name="check" size={17} /> Praktikum mata kuliah dengan perangkat yang dirawat
                secara berkala.
              </li>
              <li>
                <Icon name="check" size={17} /> Ruang pengerjaan tugas, penelitian, dan proyek
                mahasiswa.
              </li>
              <li>
                <Icon name="check" size={17} /> Pendampingan dosen, instruktur, dan asisten dosen.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="fasilitas" className="feature-band">
        <div className="section-head">
          <div>
            <h2 className="section-title">Fasilitas laboratorium</h2>
            <p className="section-note">
              Laboratorium yang dikelola Program Studi Ilmu Komputer ITG beserta kapasitasnya.
            </p>
          </div>
          <span className="badge badge-muted">{labs.length} ruang terdaftar</span>
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
              <article className="card lab-card" key={lab.id}>
                <div className="lab-card-top">
                  <span className="info-icon">
                    <Icon name="lab" size={20} />
                  </span>
                  <span
                    className={`badge ${lab.status === "AKTIF" ? "badge-success" : "badge-muted"}`}
                  >
                    {lab.status === "AKTIF" ? "Aktif" : lab.status}
                  </span>
                </div>
                <h3 className="lab-name">{labDisplayName(lab.nama, lab.kode)}</h3>
                <p className="lab-code">{lab.kode}</p>
                <div className="lab-meta">
                  <div>
                    <span className="stat-label">Lokasi</span>
                    <span className="lab-meta-value">Ruang {labRoom(lab.nama, lab.lokasi)}</span>
                  </div>
                  <div>
                    <span className="stat-label">Kapasitas</span>
                    <span className="lab-meta-value">{lab.kapasitas} orang</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="feature-band">
        <div className="section-head">
          <div>
            <h2 className="section-title">Suasana laboratorium</h2>
            <p className="section-note">
              Gambaran ruang praktikum dan kegiatan komputasi yang berlangsung di laboratorium.
            </p>
          </div>
        </div>
        <div className="gallery-grid">
          <figure className="gallery-item gallery-item-wide">
            <img
              src="/images/gallery-computers.jpg"
              alt="Barisan komputer dan meja praktikum di ruang laboratorium"
            />
            <figcaption>
              <span>Ruang praktikum</span>
              <strong>Komputer siap pakai untuk kegiatan terjadwal</strong>
            </figcaption>
          </figure>
          <figure className="gallery-item">
            <img
              src="/images/gallery-lab.jpg"
              alt="Ruang laboratorium komputer dengan meja dan kursi kerja"
            />
            <figcaption>
              <span>Area kerja</span>
              <strong>Ruang nyaman untuk belajar dan berdiskusi</strong>
            </figcaption>
          </figure>
          <figure className="gallery-item">
            <img
              src="/images/gallery-code.jpg"
              alt="Layar komputer menampilkan kode program"
            />
            <figcaption>
              <span>Kegiatan praktikum</span>
              <strong>Belajar pemrograman dan pengembangan aplikasi</strong>
            </figcaption>
          </figure>
        </div>
        <p className="gallery-credit">
          Foto suasana: Unsplash; Wikimedia Commons — Kiruthikapalani dan LN9267 (CC BY-SA 4.0).
        </p>
      </section>

      <section id="menu" className="feature-band">
        <div className="section-head">
          <div>
            <h2 className="section-title">Menu informasi</h2>
            <p className="section-note">
              Layanan operasional laboratorium tersedia di halaman terpisah.
            </p>
          </div>
        </div>
        <div className="menu-grid">
          {MENU.map((item) => (
            <Link key={item.href} href={item.href} className="menu-card">
              <span className="info-icon">
                <Icon name={item.icon} size={20} />
              </span>
              <span className="menu-copy">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </span>
              <Icon name="chevron" size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="feature-band" style={{ paddingTop: 0 }}>
        <div className="contact-card">
          <span className="info-icon">
            <Icon name="prodi" size={22} />
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
