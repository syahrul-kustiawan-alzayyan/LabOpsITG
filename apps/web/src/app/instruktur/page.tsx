"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon, IconName } from "@/components/Icon";
import { ScheduleGrid } from "@/components/ScheduleGrid";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type Course = {
  id: string;
  kode: string;
  nama: string;
  instrukturId: string | null;
  asistenIds: string[];
  kelas: string[];
  jadwalHariIni: Array<{
    kelas: string;
    jamMulai: string;
    jamSelesai: string;
    labKode: string | null;
  }>;
  asistenCount: number;
  team: Array<{
    id: string;
    nama: string;
    email: string;
    subRoles: string[];
    peran: string;
  }>;
};

type SessionGroup = {
  key: string;
  sesiId: string;
  mataKuliahId: string;
  mataKuliah: string;
  kelas: string;
  labKode: string | null;
  jamMulai: string;
  jamSelesai: string;
  tanggal: string | null;
  pertemuanKe: number;
  materi: string | null;
  total: number;
  hadir: number;
  validated: number;
  canEdit?: boolean;
  members: Array<{ id: string; nama: string; status: string; validated: boolean }>;
};

type ScheduleItem = {
  id: string;
  labId: string;
  mataKuliah: string;
  kelas: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lab?: { kode?: string; nama?: string } | null;
  pengampu?: { nama?: string } | null;
  course?: { id?: string; kode?: string; nama?: string } | null;
  asisten?: Array<{ id: string; nama: string }>;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function attendanceBadge(total: number, pct: number) {
  if (!total) return "badge-muted";
  if (pct >= 80) return "badge-success";
  if (pct >= 50) return "badge-warning";
  return "badge-danger";
}

export default function InstrukturDashboardPage() {
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionGroup[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [meRes, courseRes, sessionRes, scheduleRes] = await Promise.all([
          api<{ user: any }>("/auth/me"),
          api<Course[]>("/attendance/instruktur/courses"),
          api<SessionGroup[]>("/attendance/instruktur/sessions"),
          api<ScheduleItem[]>("/schedules/mine").catch(() => []),
        ]);
        if (!alive) return;
        setMe(meRes.user);
        setCourses(courseRes);
        setSessions(sessionRes);
        setSchedules(scheduleRes);
      } catch (e: any) {
        if (alive) setError(e?.message || "Tidak dapat memuat dasbor instruktur.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const todayDow = now.getDay();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const todaySchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        const start = (s.tanggalMulai || "").slice(0, 10);
        const end = (s.tanggalSelesai || "").slice(0, 10);
        const inRange = (!start || start <= todayIso) && (!end || end >= todayIso);
        return s.hari === todayDow && inRange;
      })
      .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  }, [schedules, todayDow, todayIso]);

  const gridLabs = useMemo(() => {
    const map = new Map<string, { id: string; kode: string; nama: string }>();
    for (const s of todaySchedules) {
      if (!s.lab) continue;
      map.set(s.labId, { id: s.labId, kode: s.lab.kode || "-", nama: s.lab.nama || "" });
    }
    return [...map.values()];
  }, [todaySchedules]);

  const courseStats = useMemo(() => {
    const map = new Map<string, { sesi: number; total: number; hadir: number; lastTanggal: string | null }>();
    for (const s of sessions) {
      if (!s.mataKuliahId) continue;
      if (!map.has(s.mataKuliahId)) {
        map.set(s.mataKuliahId, { sesi: 0, total: 0, hadir: 0, lastTanggal: null });
      }
      const st = map.get(s.mataKuliahId)!;
      st.sesi += 1;
      st.total += s.total;
      st.hadir += s.hadir;
      if (s.tanggal && (!st.lastTanggal || s.tanggal > st.lastTanggal)) st.lastTanggal = s.tanggal;
    }
    return map;
  }, [sessions]);

  const totals = useMemo(() => {
    let total = 0;
    let hadir = 0;
    const students = new Set<string>();
    for (const s of sessions) {
      total += s.total;
      hadir += s.hadir;
      for (const member of s.members) students.add(member.id);
    }
    return {
      total,
      hadir,
      students: students.size,
      pct: total ? Math.round((hadir / total) * 100) : 0,
    };
  }, [sessions]);

  const asInstruktur = useMemo(
    () => courses.filter((c) => me?.id && c.instrukturId === me.id).length,
    [courses, me],
  );
  const asAsisten = Math.max(0, courses.length - asInstruktur);
  const isAsdos = me?.role === "ASISTEN_DOSEN";
  const greeting = me?.nama ? me.nama.split(" ")[0] : "Rekan";
  const activeLabs = new Set(todaySchedules.map((s) => s.labId)).size;

  const QUICK_ACTIONS: { href: string; label: string; desc: string; icon: IconName }[] = [
    {
      href: "/attendance",
      label: "Buat sesi absensi",
      desc: "Buat QR kehadiran untuk kelas yang Anda ampu.",
      icon: "qr",
    },
    {
      href: "/instruktur/matakuliah",
      label: "Mata kuliah saya",
      desc: "Lihat kelas, tim pengajar, dan rekap kehadiran.",
      icon: "book",
    },
    {
      href: "/schedules",
      label: "Jadwal mengajar",
      desc: "Periksa ruangan dan jam praktikum Anda.",
      icon: "calendar",
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <p className="hero-eyebrow" style={{ marginBottom: 6 }}>
            Dasbor {isAsdos ? "asisten dosen" : "instruktur"}
          </p>
          <h1 className="page-title">Selamat datang, {greeting}</h1>
          <p className="page-subtitle">
            Ringkasan kelas yang Anda ampu, jadwal mengajar hari ini, dan rekam kehadiran
            mahasiswa dalam satu tempat.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/instruktur/matakuliah" className="btn btn-secondary">
            <Icon name="book" size={16} /> Mata kuliah saya
          </Link>
          <Link href="/attendance" className="btn">
            <Icon name="qr" size={16} /> Buat sesi absensi
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="ops-strip">
          {[0, 1, 2, 3].map((i) => (
            <div className="ops-stat" key={i}>
              <div className="skeleton" style={{ width: "55%" }} />
              <div className="skeleton" style={{ width: "35%", height: 26, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ops-strip reveal">
          <Link href="/instruktur/matakuliah" className="ops-stat">
            <span className="ops-stat-label">
              <Icon name="book" size={14} /> Mata kuliah
            </span>
            <span className="ops-stat-value">{courses.length}</span>
            <span className="ops-stat-note">
              {asInstruktur} sebagai instruktur · {asAsisten} sebagai asisten
            </span>
          </Link>
          <Link href="/schedules" className={`ops-stat ${todaySchedules.length ? "is-alert" : ""}`}>
            <span className="ops-stat-label">
              <Icon name="calendar" size={14} /> Jadwal hari ini
            </span>
            <span className="ops-stat-value">{todaySchedules.length}</span>
            <span className="ops-stat-note">
              {HARI[todayDow]} · {activeLabs} ruang lab
            </span>
          </Link>
          <Link href="/attendance" className="ops-stat">
            <span className="ops-stat-label">
              <Icon name="attendance" size={14} /> Kehadiran rata-rata
            </span>
            <span className="ops-stat-value">{totals.pct}%</span>
            <span className="ops-stat-note">
              {totals.hadir} hadir dari {totals.total} catatan
            </span>
          </Link>
          <Link href="/attendance" className="ops-stat">
            <span className="ops-stat-label">
              <Icon name="users" size={14} /> Mahasiswa tercatat
            </span>
            <span className="ops-stat-value">{totals.students}</span>
            <span className="ops-stat-note">peserta unik pada riwayat sesi Anda</span>
          </Link>
        </div>
      )}

      <div className="coord-split">
        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Jadwal mengajar hari ini</h2>
              <p className="card-note">
                {HARI[todayDow]}, {fmtDate(todayIso)} · {todaySchedules.length} sesi
              </p>
            </div>
            <Link href="/schedules" className="btn btn-secondary btn-sm">
              Semua jadwal <Icon name="chevron" size={13} />
            </Link>
          </div>
          <div style={{ padding: "0 22px 20px" }}>
            {todaySchedules.length === 0 ? (
              <div className="empty" style={{ padding: "24px 0" }}>
                <Icon name="calendar" size={22} />
                <p className="empty-title">Tidak ada jadwal hari ini</p>
                <p className="empty-text">Tidak ada kelas yang perlu Anda ajar hari ini.</p>
              </div>
            ) : (
              <div className="room-list">
                {todaySchedules.map((s) => {
                  const course = courses.find(
                    (c) =>
                      (s.course?.id && c.id === s.course.id) ||
                      c.kode === (s.course?.kode || s.mataKuliah),
                  );
                  const sesi = course ? sessions.find((x) => x.mataKuliahId === course.id && x.tanggal === todayIso) : undefined;
                  return (
                    <div className="room-row" key={s.id}>
                      <div>
                        <div className="room-name">
                          {s.jamMulai}–{s.jamSelesai} · {s.mataKuliah}
                        </div>
                        <div className="room-sub">
                          {s.kelas || "-"} · {s.lab?.kode || "Lab belum ditentukan"} ·{" "}
                          {s.pengampu?.nama || "Belum ada pengampu"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {sesi && (
                          <span className={`badge ${attendanceBadge(sesi.total, sesi.total ? Math.round((sesi.hadir / sesi.total) * 100) : 0)}`}>
                            {sesi.hadir}/{sesi.total} hadir
                          </span>
                        )}
                        <Link href="/attendance" className="btn btn-secondary btn-sm">
                          <Icon name="qr" size={13} /> Absensi
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Aksi cepat</h2>
              <p className="card-note">Pintasan ke pekerjaan yang paling sering Anda pakai.</p>
            </div>
          </div>
          <div style={{ padding: "0 22px 20px" }}>
            <div className="room-list">
              {QUICK_ACTIONS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="room-row"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span className="coord-menu-icon" style={{ width: 34, height: 34 }}>
                      <Icon name={item.icon} size={17} />
                    </span>
                    <div>
                      <div className="room-name">{item.label}</div>
                      <div className="room-sub">{item.desc}</div>
                    </div>
                  </div>
                  <Icon name="chevron" size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="coord-split" style={{ marginTop: 16 }}>
        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Mata kuliah yang Anda ampu</h2>
              <p className="card-note">Kelas, tim pengajar, dan capaian kehadiran terbaru.</p>
            </div>
            <Link href="/instruktur/matakuliah" className="btn btn-secondary btn-sm">
              Detail <Icon name="chevron" size={13} />
            </Link>
          </div>
          <div style={{ padding: "0 22px 20px" }}>
            {courses.length === 0 ? (
              <div className="empty" style={{ padding: "24px 0" }}>
                <Icon name="book" size={22} />
                <p className="empty-title">Belum ada mata kuliah</p>
                <p className="empty-text">
                  Anda belum tercatat sebagai instruktur atau asisten dosen pada mata kuliah aktif.
                </p>
              </div>
            ) : (
              <div className="room-list">
                {courses.map((c) => {
                  const stats = courseStats.get(c.id);
                  const pct = stats?.total ? Math.round((stats.hadir / stats.total) * 100) : 0;
                  const peran = c.instrukturId === me?.id ? "Instruktur" : "Asisten dosen";
                  return (
                    <div className="room-row" key={c.id}>
                      <div>
                        <Link href="/instruktur/matakuliah" className="room-name room-link">
                          {c.kode} · {c.nama}
                        </Link>
                        <div className="room-sub">
                          {peran} · {c.kelas.length} kelas · {c.asistenCount} asisten
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {c.jadwalHariIni.length > 0 && (
                          <span className="badge badge-info">
                            {c.jadwalHariIni.length} jadwal hari ini
                          </span>
                        )}
                        <span className={`badge ${attendanceBadge(stats?.total || 0, pct)}`}>
                          {stats?.total ? `${pct}% hadir` : "Belum ada sesi"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Riwayat sesi absensi</h2>
              <p className="card-note">Pertemuan terakhir yang Anda catat.</p>
            </div>
            <Link href="/attendance" className="btn btn-secondary btn-sm">
              Kelola <Icon name="chevron" size={13} />
            </Link>
          </div>
          <div style={{ padding: "0 22px 20px" }}>
            {sessions.length === 0 ? (
              <div className="empty" style={{ padding: "24px 0" }}>
                <Icon name="attendance" size={22} />
                <p className="empty-title">Belum ada sesi absensi</p>
                <p className="empty-text">Buat sesi QR pertama Anda untuk mulai mencatat kehadiran.</p>
                <Link href="/attendance" className="btn btn-sm" style={{ marginTop: 10 }}>
                  <Icon name="qr" size={14} /> Buat sesi
                </Link>
              </div>
            ) : (
              <div className="room-list">
                {sessions.slice(0, 6).map((s) => {
                  const pct = s.total ? Math.round((s.hadir / s.total) * 100) : 0;
                  const canEdit = s.canEdit ?? s.validated === 0;
                  const editHref = `/attendance?editSesi=${encodeURIComponent(s.sesiId)}&editTanggal=${encodeURIComponent(
                    s.tanggal || "",
                  )}&editPertemuan=${s.pertemuanKe ?? ""}`;
                  const qrHref = `/attendance?qrSesi=${encodeURIComponent(s.sesiId)}&qrTanggal=${encodeURIComponent(
                    s.tanggal || "",
                  )}&qrPertemuan=${s.pertemuanKe ?? ""}`;
                  return (
                    <div className="room-row" key={s.key}>
                      <div>
                        <div className="room-name">
                          {s.mataKuliah} · {s.kelas}
                        </div>
                        <div className="room-sub">
                          {fmtDate(s.tanggal)} · Pertemuan {s.pertemuanKe} ·{" "}
                          {s.labKode || "Lab"} · {s.jamMulai}–{s.jamSelesai}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className={`badge ${attendanceBadge(s.total, pct)}`}>
                          {s.hadir}/{s.total} hadir
                        </span>
                        {canEdit ? (
                          <>
                            <Link href={editHref} className="btn btn-secondary btn-sm">
                              Edit
                            </Link>
                            <Link href={qrHref} className="btn btn-ghost btn-sm">
                              <Icon name="qr" size={13} /> QR
                            </Link>
                          </>
                        ) : (
                          <span className="badge badge-muted">Hanya lihat</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card card-flush" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">Peta lab hari ini</h2>
            <p className="card-note">Posisi kelas Anda pada denah waktu laboratorium.</p>
          </div>
          <Link href="/schedules" className="btn btn-secondary btn-sm">
            Semua jadwal <Icon name="chevron" size={13} />
          </Link>
        </div>
        <div style={{ padding: "0 0 4px" }}>
          <ScheduleGrid
            schedules={todaySchedules}
            labs={gridLabs}
            emptyLabel="Tidak ada jadwal mengajar hari ini"
          />
        </div>
      </div>
    </>
  );
}
