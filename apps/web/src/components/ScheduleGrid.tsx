import Link from "next/link";

export type GridSchedule = {
  id: string;
  labId: string;
  mataKuliah: string;
  kelas: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  lab?: { kode?: string; nama?: string };
  pengampu?: { nama?: string } | null;
};

const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function toHour(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function ScheduleGrid({
  schedules,
  labs,
  bookings = [],
  showBookings = false,
  emptyLabel = "Tidak ada sesi pada hari ini.",
}: {
  schedules: GridSchedule[];
  labs: { id: string; kode: string; nama: string }[];
  bookings?: { id: string; labId: string; jamMulai: string; jamSelesai: string; keperluan: string }[];
  showBookings?: boolean;
  emptyLabel?: string;
}) {
  const rows = labs.filter((lab) => schedules.some((s) => s.labId === lab.id) || (showBookings && bookings.some((b) => b.labId === lab.id)));

  if (rows.length === 0) {
    return (
      <div className="timetable">
        <div className="empty">
          <p className="empty-title">{emptyLabel}</p>
          <p className="empty-text">Jadwal akan tampil di sini begitu sesi ditambahkan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timetable">
      <div className="tt-scroll">
        <div style={{ minWidth: 780 }}>
          <div
            className="tt-grid"
            style={{ ["--hours" as any]: HOURS.length, gridTemplateColumns: `74px repeat(${HOURS.length}, minmax(58px, 1fr))` }}
          >
            <div className="tt-head">Lab</div>
            {HOURS.map((h) => (
              <div className="tt-head" key={h}>
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>

          {rows.map((lab) => {
            const items = schedules.filter((s) => s.labId === lab.id);
            const bookingsHere = showBookings ? bookings.filter((b) => b.labId === lab.id) : [];
            return (
              <div className="tt-lab-row" key={lab.id}>
                <div className="tt-row-label">
                  {lab.kode}
                  <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>{lab.nama}</div>
                </div>
                <div className="tt-track">
                  {items.map((s) => {
                    const start = clamp(toHour(s.jamMulai), START_HOUR, END_HOUR);
                    const end = clamp(toHour(s.jamSelesai), START_HOUR, END_HOUR);
                    const width = Math.max(1 / HOURS.length, (end - start) / HOURS.length);
                    const left = (start - START_HOUR) / HOURS.length;
                    return (
                      <Link
                        key={s.id}
                        href={`/schedules?lab=${s.labId}`}
                        className="tt-block"
                        style={{ left: `${left * 100}%`, width: `${width * 100}%` }}
                        title={`${s.mataKuliah} · ${s.kelas} · ${s.jamMulai}–${s.jamSelesai}${s.pengampu?.nama ? ` · ${s.pengampu.nama}` : ""}`}
                      >
                        <span className="tt-code">
                          {s.jamMulai}–{s.jamSelesai}
                        </span>
                        {s.mataKuliah}
                        <span style={{ display: "block", opacity: 0.85 }}>{s.kelas}</span>
                      </Link>
                    );
                  })}
                  {bookingsHere.map((b) => {
                    const start = clamp(toHour(b.jamMulai), START_HOUR, END_HOUR);
                    const end = clamp(toHour(b.jamSelesai), START_HOUR, END_HOUR);
                    const width = Math.max(1 / HOURS.length, (end - start) / HOURS.length);
                    const left = (start - START_HOUR) / HOURS.length;
                    return (
                      <span
                        key={b.id}
                        className="tt-block booking"
                        style={{ left: `${left * 100}%`, width: `${width * 100}%`, position: "absolute", cursor: "default" }}
                        title={`Peminjaman: ${b.keperluan} (${b.jamMulai}–${b.jamSelesai})`}
                      >
                        <span className="tt-code">
                          {b.jamMulai}–{b.jamSelesai}
                        </span>
                        {b.keperluan}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="tt-legend">
        <span>
          <i className="tt-swatch" style={{ background: "var(--petrol-600)" }} /> Praktikum
        </span>
        {showBookings && (
          <span>
            <i className="tt-swatch" style={{ background: "var(--signal-050)", border: "1px dashed var(--signal)" }} /> Peminjaman disetujui
          </span>
        )}
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{rows.length} lab · {HOURS[0]}:00–{END_HOUR}:00</span>
      </div>
    </div>
  );
}
