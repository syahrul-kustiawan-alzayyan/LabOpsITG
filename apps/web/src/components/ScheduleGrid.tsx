import Link from "next/link";
import { labDisplayName } from "@/lib/lab-label";

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

type GridBooking = {
  id: string;
  labId: string;
  jamMulai: string;
  jamSelesai: string;
  keperluan: string;
};

const TRACK_HEIGHT = 92;
const BLOCK_GAP = 6;
const DEFAULT_START = 7;
const DEFAULT_END = 18;
const MIN_SPAN = 8;

type RowBlock = {
  key: string;
  kind: "schedule" | "booking";
  start: number;
  end: number;
  lane: number;
  lanes: number;
  schedule?: GridSchedule;
  booking?: GridBooking;
};

function toHour(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Rentang jam mengikuti data supaya tidak ada ruang kosong yang bikin
 * blok sesi menyempit. Minimal 8 jam agar sumbu waktu tetap terbaca.
 */
export function hourRangeFor(items: { jamMulai: string; jamSelesai: string }[]) {
  if (items.length === 0) return { start: DEFAULT_START, end: DEFAULT_END };
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  for (const item of items) {
    start = Math.min(start, Math.floor(toHour(item.jamMulai)));
    end = Math.max(end, Math.ceil(toHour(item.jamSelesai)));
  }
  if (end - start < MIN_SPAN) end = start + MIN_SPAN;
  return { start: clamp(start, 0, 23), end: clamp(end, 1, 24) };
}

/**
 * Menempatkan blok yang beririsan ke lajur terpisah agar tidak saling
 * menumpuk. Sesi yang bersambung (selesai = mulai berikutnya) tetap satu lajur.
 */
function layoutBlocks(items: Omit<RowBlock, "lane" | "lanes">[]): RowBlock[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: RowBlock[] = [];
  let cluster: RowBlock[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanes = Math.max(...cluster.map((b) => b.lane)) + 1;
    cluster.forEach((b) => {
      b.lanes = lanes;
    });
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd - 0.001) flush();

    let lane = laneEnds.findIndex((end) => end <= item.start + 0.001);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }

    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }

  flush();
  return placed;
}

export function ScheduleGrid({
  schedules,
  labs,
  bookings = [],
  showBookings = false,
  emptyLabel = "Tidak ada sesi pada hari ini.",
  hourRange,
}: {
  schedules: GridSchedule[];
  labs: { id: string; kode: string; nama: string }[];
  bookings?: GridBooking[];
  showBookings?: boolean;
  emptyLabel?: string;
  hourRange?: { start: number; end: number };
}) {
  const range = hourRange ?? hourRangeFor([...schedules, ...bookings]);
  const span = range.end - range.start;
  const hours = Array.from({ length: span }, (_, i) => range.start + i);

  const rows = labs.filter(
    (lab) =>
      schedules.some((s) => s.labId === lab.id) ||
      (showBookings && bookings.some((b) => b.labId === lab.id)),
  );

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
        <div className="tt-canvas" style={{ ["--hours" as any]: hours.length }}>
          <div className="tt-grid">
            <div className="tt-head tt-head-label">Jam</div>
            {hours.map((h) => (
              <div className="tt-head" key={h}>
                {String(h).padStart(2, "0")}<span className="tt-hour-min">:00</span>
              </div>
            ))}
          </div>

          {rows.map((lab) => {
            const displayName = labDisplayName(lab.nama, lab.kode);
            const blocks: Omit<RowBlock, "lane" | "lanes">[] = [
              ...schedules
                .filter((s) => s.labId === lab.id)
                .map((s) => ({
                  key: s.id,
                  kind: "schedule" as const,
                  start: clamp(toHour(s.jamMulai), range.start, range.end),
                  end: clamp(toHour(s.jamSelesai), range.start, range.end),
                  schedule: s,
                })),
              ...(showBookings
                ? bookings
                    .filter((b) => b.labId === lab.id)
                    .map((b) => ({
                      key: b.id,
                      kind: "booking" as const,
                      start: clamp(toHour(b.jamMulai), range.start, range.end),
                      end: clamp(toHour(b.jamSelesai), range.start, range.end),
                      booking: b,
                    }))
                : []),
            ];
            const placed = layoutBlocks(blocks);
            const laneCount = Math.max(1, ...placed.map((b) => b.lanes));

            return (
              <div className="tt-lab-row" key={lab.id}>
                <div className="tt-row-label">
                  <span className="tt-row-code">{lab.kode}</span>
                  {displayName && displayName !== lab.kode && (
                    <span className="tt-row-name" title={lab.nama}>
                      {displayName}
                    </span>
                  )}
                </div>
                <div className="tt-track" style={{ height: TRACK_HEIGHT * laneCount }}>
                  {placed.map((block) => {
                    const width = Math.max(1 / span, (block.end - block.start) / span);
                    const left = (block.start - range.start) / span;
                    const style = {
                      left: `${left * 100}%`,
                      width: `${width * 100}%`,
                      top: BLOCK_GAP + block.lane * TRACK_HEIGHT,
                      height: TRACK_HEIGHT - BLOCK_GAP * 2,
                    };

                    if (block.kind === "schedule" && block.schedule) {
                      const s = block.schedule;
                      const meta = [s.kelas ? `Kelas ${s.kelas}` : "", s.pengampu?.nama || ""]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <Link
                          key={block.key}
                          href={`/schedules?lab=${s.labId}`}
                          className="tt-block"
                          style={style}
                          title={`${s.mataKuliah} · ${s.kelas} · ${s.jamMulai}–${s.jamSelesai}${s.pengampu?.nama ? ` · ${s.pengampu.nama}` : ""}`}
                        >
                          <span className="tt-time">
                            {s.jamMulai}–{s.jamSelesai}
                          </span>
                          <span className="tt-course">{s.mataKuliah}</span>
                          {meta && <span className="tt-meta">{meta}</span>}
                        </Link>
                      );
                    }

                    const b = block.booking!;
                    return (
                      <span
                        key={block.key}
                        className="tt-block booking"
                        style={style}
                        title={`Peminjaman: ${b.keperluan} (${b.jamMulai}–${b.jamSelesai})`}
                      >
                        <span className="tt-time">
                          {b.jamMulai}–{b.jamSelesai}
                        </span>
                        <span className="tt-course">{b.keperluan}</span>
                        <span className="tt-meta">Peminjaman disetujui</span>
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
            <i
              className="tt-swatch"
              style={{ background: "var(--signal-050)", border: "1px dashed var(--signal)" }}
            />{" "}
            Peminjaman disetujui
          </span>
        )}
        <span className="tt-legend-range">
          {rows.length} lab · {String(range.start).padStart(2, "0")}:00–
          {String(range.end).padStart(2, "0")}:00
        </span>
      </div>
    </div>
  );
}
