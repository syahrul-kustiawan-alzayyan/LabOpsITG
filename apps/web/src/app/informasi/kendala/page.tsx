import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";

export default function KendalaInfoPage() {
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
              Laporkan kerusakan perangkat, gangguan jaringan, atau masalah fasilitas laboratorium
              agar dapat ditindaklanjuti oleh pengelola.
            </p>
          </div>
        </div>

        <div className="info-grid">
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
            <div className="info-cta">
              <Link href="/issues" className="btn">
                <Icon name="issue" size={15} /> Buka halaman pelaporan
              </Link>
              <p className="info-hint">Anda akan diminta masuk dengan akun kampus.</p>
            </div>
          </article>

          <article className="info-card">
            <span className="info-icon">
              <Icon name="shield" size={20} />
            </span>
            <h3>Alur penanganan</h3>
            <ul className="info-list">
              <li>
                <Icon name="check" size={15} /> Laporan mendapat nomor tiket dan tercatat dalam sistem.
              </li>
              <li>
                <Icon name="check" size={15} /> Koordinator memverifikasi laporan dan menetapkan penanggung jawab.
              </li>
              <li>
                <Icon name="check" size={15} /> Status penanganan dapat dipantau melalui riwayat tiket.
              </li>
              <li>
                <Icon name="check" size={15} /> Notifikasi in-app memberi kabar saat status berubah.
              </li>
            </ul>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
