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

const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const LABEL_WIDTH = 88;
const TRACK_HEIGHT = 64;
const BLOCK_GAP = 4;

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
}: {
  schedules: GridSchedule[];
  labs: { id: string; kode: string; nama: string }[];
  bookings?: GridBooking[];
  showBookings?: boolean;
  emptyLabel?: string;
}) {
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
        <div style={{ minWidth: 860 }}>
          <div
            className="tt-grid"
            style={{
              ["--hours" as any]: HOURS.length,
              gridTemplateColumns: `${LABEL_WIDTH}px repeat(${HOURS.length}, minmax(62px, 1fr))`,
            }}
          >
            <div className="tt-head">Lab</div>
            {HOURS.map((h) => (
              <div className="tt-head" key={h}>
                {String(h).padStart(2, "0")}
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
                  start: clamp(toHour(s.jamMulai), START_HOUR, END_HOUR),
                  end: clamp(toHour(s.jamSelesai), START_HOUR, END_HOUR),
                  schedule: s,
                })),
              ...(showBookings
                ? bookings
                    .filter((b) => b.labId === lab.id)
                    .map((b) => ({
                      key: b.id,
                      kind: "booking" as const,
                      start: clamp(toHour(b.jamMulai), START_HOUR, END_HOUR),
                      end: clamp(toHour(b.jamSelesai), START_HOUR, END_HOUR),
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
                    const width = Math.max(
                      1 / HOURS.length,
                      (block.end - block.start) / HOURS.length,
                    );
                    const left = (block.start - START_HOUR) / HOURS.length;
                    const style = {
                      left: `${left * 100}%`,
                      width: `${width * 100}%`,
                      top: BLOCK_GAP + block.lane * TRACK_HEIGHT,
                      height: TRACK_HEIGHT - BLOCK_GAP * 2,
                    };

                    if (block.kind === "schedule" && block.schedule) {
                      const s = block.schedule;
                      return (
                        <Link
                          key={block.key}
                          href={`/schedules?lab=${s.labId}`}
                          className="tt-block"
                          style={style}
                          title={`${s.mataKuliah} · ${s.kelas} · ${s.jamMulai}–${s.jamSelesai}${s.pengampu?.nama ? ` · ${s.pengampu.nama}` : ""}`}
                        >
                          <span className="tt-code">
                            {s.jamMulai}–{s.jamSelesai}
                          </span>
                          <span className="tt-course">{s.mataKuliah}</span>
                          <span className="tt-class" style={{ display: "block", opacity: 0.85 }}>
                            {s.kelas}
                          </span>
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
                        <span className="tt-code">
                          {b.jamMulai}–{b.jamSelesai}
                        </span>
                        <span className="tt-course">{b.keperluan}</span>
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
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
          {rows.length} lab · {HOURS[0]}:00–{END_HOUR}:00
        </span>
      </div>
    </div>
  );
}
