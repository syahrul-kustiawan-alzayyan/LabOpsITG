"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const STATUS_OPTIONS = [
  { value: "HADIR", label: "Hadir" },
  { value: "TERLAMBAT", label: "Terlambat" },
  { value: "IZIN", label: "Izin" },
  { value: "SAKIT", label: "Sakit" },
  { value: "TIDAK_HADIR", label: "Tidak hadir" },
];

const STATUS_BADGE: Record<string, string> = {
  HADIR: "badge-success",
  TERLAMBAT: "badge-warning",
  IZIN: "badge-info",
  SAKIT: "badge-info",
  TIDAK_HADIR: "badge-danger",
};

const PERAN_LABEL: Record<string, string> = {
  INSTRUKTUR: "Instruktur",
  ASISTEN_DOSEN: "Asisten dosen",
};

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function initials(name: string) {
  return name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function timeOf(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Member = {
  id: string;
  nama: string;
  email: string;
  peran: "INSTRUKTUR" | "ASISTEN_DOSEN";
  status: string | null;
  attendanceId: string | null;
  scannedAt: string | null;
  source: string | null;
};

type TeamSession = {
  id: string;
  mataKuliah: string;
  kode: string | null;
  kelas: string;
  semester: string;
  jamMulai: string;
  jamSelesai: string;
  lab: { id: string; kode: string; nama: string };
  members: Member[];
  complete: boolean;
  ongoing: boolean;
};

type TeamData = {
  date: string;
  hari: number;
  hariNama: string;
  isToday: boolean;
  canMark: boolean;
  sessions: TeamSession[];
};

export function TeamAttendance({ onSaved }: { onSaved?: () => void }) {
  const [date, setDate] = useState(jakartaToday);
  const [data, setData] = useState<TeamData | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const load = useCallback(async (targetDate: string) => {
    setLoading(true);
    try {
      const result = await api<TeamData>(`/attendance/team?date=${targetDate}`);
      setData(result);
      const next: Record<string, Record<string, string>> = {};
      for (const session of result.sessions) {
        next[session.id] = {};
        for (const member of session.members) {
          next[session.id][member.id] = member.status || "HADIR";
        }
      }
      setDrafts(next);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  function setStatus(sesiId: string, userId: string, status: string) {
    setDrafts((prev) => ({
      ...prev,
      [sesiId]: { ...(prev[sesiId] || {}), [userId]: status },
    }));
  }

  async function save(session: TeamSession, override?: Record<string, string>) {
    const values = override || drafts[session.id] || {};
    const records = session.members.map((member) => ({
      userId: member.id,
      status: values[member.id] || member.status || "HADIR",
    }));
    setSaving(session.id);
    setMsg(null);
    try {
      await api("/attendance/team", {
        method: "POST",
        body: { sesiId: session.id, date, records },
      });
      setMsg({ type: "success", text: `Absensi ${session.mataKuliah} (kelas ${session.kelas}) tersimpan.` });
      await load(date);
      onSaved?.();
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setSaving(null);
    }
  }

  function markAllHadir(session: TeamSession) {
    const all: Record<string, string> = {};
    for (const member of session.members) all[member.id] = "HADIR";
    setDrafts((prev) => ({ ...prev, [session.id]: all }));
    save(session, all);
  }

  const sessions = data?.sessions ?? [];
  const totalMembers = sessions.reduce((sum, s) => sum + s.members.length, 0);
  const recorded = sessions.reduce((sum, s) => sum + s.members.filter((m) => m.status).length, 0);

  return (
    <div className="card team-attendance">
      <div className="card-head team-head">
        <div>
          <h2 className="card-title">Absensi tim pengajar</h2>
          <p className="card-note">
            Anda mengabsen diri sendiri dan asisten dosen untuk setiap sesi praktikum. Pilih tanggal, lalu simpan
            kehadiran tim.
          </p>
        </div>
        <div className="team-date">
          <label htmlFor="team-date">Tanggal</label>
          <input
            id="team-date"
            type="date"
            className="input"
            value={date}
            max={jakartaToday()}
            onChange={(e) => setDate(e.target.value || jakartaToday())}
          />
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {data && (
        <div className="team-summary">
          <span className="badge badge-plain">
            {data.hariNama} · {new Date(`${data.date}T00:00:00Z`).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <span className="badge badge-plain">{sessions.length} sesi</span>
          <span className={recorded === totalMembers && totalMembers > 0 ? "badge badge-success" : "badge badge-muted"}>
            {recorded} dari {totalMembers} anggota tercatat
          </span>
        </div>
      )}

      {loading ? (
        <div className="team-grid">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty">
          <Icon name="calendar" size={24} />
          <p className="empty-title">Tidak ada sesi pada tanggal ini</p>
          <p className="empty-text">
            {data?.isToday
              ? "Jadwal praktikum Anda tidak berlangsung hari ini."
              : "Pilih tanggal lain yang sesuai hari jadwal praktikum Anda."}
          </p>
        </div>
      ) : (
        <div className="team-grid">
          {sessions.map((session) => {
            const draft = drafts[session.id] || {};
            const status = session.ongoing ? "Berlangsung" : session.complete ? "Tercatat" : "Belum diisi";
            const tone = session.ongoing ? "badge-warning" : session.complete ? "badge-success" : "badge-muted";
            return (
              <article className="team-session" key={session.id}>
                <header className="team-session-head">
                  <div className="team-session-title">
                    <div className="team-session-meta">
                      {session.kode && <span className="badge badge-plain">{session.kode}</span>}
                      <span className="badge badge-muted">Kelas {session.kelas}</span>
                      <span className={`badge ${tone}`}>{status}</span>
                    </div>
                    <h3>{session.mataKuliah}</h3>
                    <p className="card-note">
                      {session.lab.kode} · {session.jamMulai}–{session.jamSelesai} · {session.semester}
                    </p>
                  </div>
                </header>

                <div className="team-members">
                  {session.members.map((member) => (
                    <div className="team-member" key={member.id}>
                      <span className="team-avatar" aria-hidden="true">
                        {initials(member.nama)}
                      </span>
                      <div className="team-member-main">
                        <strong>{member.nama}</strong>
                        <span>{PERAN_LABEL[member.peran] || member.peran}</span>
                      </div>
                      <div className="team-member-status">
                        {member.status && (
                          <span className={`badge ${STATUS_BADGE[member.status] || "badge-muted"}`}>
                            {member.status.replace("_", " ").toLowerCase()}
                          </span>
                        )}
                        <select
                          className="input team-select"
                          aria-label={`Status ${member.nama}`}
                          value={draft[member.id] ?? member.status ?? "HADIR"}
                          onChange={(e) => setStatus(session.id, member.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {session.members.length === 0 && (
                    <p className="card-note" style={{ margin: 0 }}>
                      Tim pengajar belum lengkap. Lengkapi instruktur dan asisten pada menu Mata Kuliah.
                    </p>
                  )}
                </div>

                <footer className="team-actions">
                  {session.complete && session.members[0]?.scannedAt && (
                    <span className="team-saved-note">Tersimpan pukul {timeOf(session.members[0].scannedAt)}</span>
                  )}
                  <div className="team-action-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => markAllHadir(session)}
                      disabled={!data?.canMark || saving === session.id || session.members.length === 0}
                    >
                      Semua hadir
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => save(session)}
                      disabled={!data?.canMark || saving === session.id || session.members.length === 0}
                    >
                      <Icon name="check" size={14} />
                      {saving === session.id ? "Menyimpan…" : "Simpan absensi"}
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
