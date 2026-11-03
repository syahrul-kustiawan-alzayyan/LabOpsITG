"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { PublicShell } from "@/components/PublicShell";
import { ScheduleGrid } from "@/components/ScheduleGrid";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function JadwalPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [filterLab, setFilterLab] = useState("");
  const [day, setDay] = useState<number>(new Date().getDay());

  useEffect(() => {
    api<any[]>("/labs").then(setLabs).catch(() => {});
    api<any[]>("/schedules").then(setSchedules).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (filterLab ? schedules.filter((s) => s.labId === filterLab) : schedules),
    [schedules, filterLab],
  );
  const daySessions = filtered.filter((s) => s.hari === day);

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
              Jadwal laboratorium
            </h1>
            <p className="section-note">
              Jadwal praktikum yang sedang berjalan. Slot di luar jadwal ini dapat diajukan melalui
              halaman peminjaman.
            </p>
          </div>
          <div className="field" style={{ minWidth: 240, maxWidth: 320, flex: "0 1 320px" }}>
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

        <div className="info-card" style={{ marginTop: 18 }}>
          <span className="info-icon">
            <Icon name="booking" size={20} />
          </span>
          <h3>Butuh lab di luar jadwal?</h3>
          <p className="section-note" style={{ margin: 0 }}>
            Ajukan peminjaman melalui halaman pengajuan. Anda akan diminta masuk dengan akun kampus.
          </p>
          <div className="info-cta">
            <Link href="/informasi/peminjaman" className="btn">
              <Icon name="booking" size={15} /> Informasi peminjaman
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
