import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";

const STEPS = [
  { n: "01", title: "Pilih lab dan slot", desc: "Tentukan laboratorium, tanggal, serta jam mulai dan selesai pemakaian." },
  { n: "02", title: "Kirim pengajuan", desc: "Isi keperluan dan jumlah peserta. Sistem memeriksa bentrok dengan jadwal praktikum." },
  { n: "03", title: "Tunggu persetujuan", desc: "Koordinator laboratorium meninjau pengajuan dan memberi keputusan." },
  { n: "04", title: "Gunakan laboratorium", desc: "Setelah disetujui, gunakan lab sesuai slot dan jaga fasilitas bersama." },
];

export default function PeminjamanInfoPage() {
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
              Laboratorium dapat dipinjam untuk kegiatan di luar jadwal praktikum, seperti tugas
              besar, penelitian, pelatihan, atau kegiatan akademik lain.
            </p>
          </div>
        </div>

        <div className="feature-grid cols-4" style={{ marginBottom: 18 }}>
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
                <Icon name="check" size={15} /> Pengajuan dilakukan melalui akun kampus.
              </li>
              <li>
                <Icon name="check" size={15} /> Slot yang bentrok dengan jadwal praktikum atau peminjaman lain tidak dapat diajukan.
              </li>
              <li>
                <Icon name="check" size={15} /> Persetujuan diberikan oleh koordinator laboratorium.
              </li>
              <li>
                <Icon name="check" size={15} /> Perubahan atau pembatalan tercatat beserta alasannya.
              </li>
            </ul>
            <div className="info-cta">
              <Link href="/bookings" className="btn">
                <Icon name="booking" size={15} /> Buka halaman pengajuan
              </Link>
              <p className="info-hint">Anda akan diminta masuk dengan akun kampus.</p>
            </div>
          </article>

          <article className="info-card">
            <span className="info-icon">
              <Icon name="clock" size={20} />
            </span>
            <h3>Sebelum mengajukan</h3>
            <p className="section-note" style={{ margin: 0 }}>
              Siapkan informasi kegiatan, waktu pemakaian, dan jumlah peserta. Periksa kembali jadwal
              laboratorium agar pengajuan tidak bertabrakan dengan kegiatan praktikum.
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
