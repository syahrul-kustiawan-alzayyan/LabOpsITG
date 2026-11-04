"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import Link from "next/link";

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

function initials(name: string) {
  return name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatTanggal(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export default function AdminAttendancePage() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseDetail, setCourseDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [m, st, cs] = await Promise.all([
        api<{ user: any }>("/auth/me"),
        api<any>("/attendance/admin/stats"),
        api<any[]>("/attendance/admin/courses"),
      ]);
      setMe(m.user);
      setStats(st);
      setCourses(cs);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openCourse(course: any) {
    setSelectedCourse(course);
    setDetailLoading(true);
    setMsg(null);
    try {
      const detail = await api<any>(`/attendance/admin/courses/${course.id}`);
      setCourseDetail(detail);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedCourse(null);
    setCourseDetail(null);
  }

  if (loading) {
    return (
      <div className="content">
        <div className="page-header">
          <h1 className="page-title">Admin Absensi</h1>
          <p className="page-subtitle">Dashboard kehadiran instruktur dan asisten dosen per mata kuliah.</p>
        </div>
        <div className="empty" style={{ padding: 60, textAlign: "center" }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 14, margin: "0 auto", maxWidth: 400 }} />
        </div>
      </div>
    );
  }

  if (msg) {
    return (
      <div className="content">
        <div className="page-header">
          <h1 className="page-title">Admin Absensi</h1>
        </div>
        <div className={`alert alert-${msg.type}`}>{msg.text}</div>
      </div>
    );
  }

  const isAdmin = ["ADMIN_SYSTEM", "COORDINATOR"].includes(me?.role || "");

  // If a course is selected, show detail view
  if (selectedCourse && courseDetail) {
    return (
      <div className="content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Detail Absensi</h1>
            <p className="page-subtitle">
              Kehadiran instruktur dan asisten dosen per pertemuan untuk <strong>{courseDetail.nama}</strong>.
            </p>
          </div>
          <div className="page-actions">
            <Link href="/attendance/admin" className="btn btn-ghost">
              <span style={{ display: "inline-flex", alignItems: "center", transform: "rotate(-90deg)" }}><Icon name="chevron" size={14} /></span> Kembali
            </Link>
          </div>
        </div>

        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <div className="split-narrow">
          <div className="card">
            <div className="card-head">
              <h2 className="card-title">Ringkasan Mata Kuliah</h2>
            </div>
            <div className="validate-detail">
              <div className="validate-field">
                <span className="validate-label">Kode</span>
                <span className="validate-value mono">{courseDetail.kode}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Nama</span>
                <span className="validate-value">{courseDetail.nama}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Total Pertemuan</span>
                <span className="validate-value">{courseDetail.pertemuan.length}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Total Absensi</span>
                <span className="validate-value">
                  {courseDetail.pertemuan.reduce((sum: number, p: any) => sum + p.total, 0)}
                </span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Total Hadir</span>
                <span className="validate-value">
                  {courseDetail.pertemuan.reduce((sum: number, p: any) => sum + p.hadir, 0)}
                </span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Instruktur</span>
                <span className="validate-value">
                  {[...new Set(courseDetail.pertemuan.flatMap((p: any) => p.instruktur.map((i: any) => i.id)))].length}
                </span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Asisten Dosen</span>
                <span className="validate-value">
                  {[...new Set(courseDetail.pertemuan.flatMap((p: any) => p.asdos.map((a: any) => a.id)))].length}
                </span>
              </div>
            </div>
          </div>

          <div className="card card-flush">
            <div className="card-head">
              <h2 className="card-title">Kehadiran per Pertemuan</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pertemuan</th>
                    <th>Instruktur</th>
                    <th>Asisten Dosen</th>
                    <th>Total</th>
                    <th>Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {courseDetail.pertemuan.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty" style={{ padding: 20 }}>
                          <p className="empty-text">Belum ada data kehadiran pertemuan.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    courseDetail.pertemuan.map((p: any) => (
                      <tr key={p.pertemuanKe}>
                        <td>
                          <span className="badge badge-muted">Pertemuan {p.pertemuanKe}</span>
                        </td>
                        <td>
                          {p.instruktur.length === 0 ? (
                            <span className="badge badge-muted">—</span>
                          ) : (
                            p.instruktur.map((m: any) => (
                              <div key={m.id} className="team-member-row" style={{ padding: "4px 0" }}>
                                <span className="team-avatar" style={{ width: 24, height: 24, fontSize: 10 }} aria-hidden="true">
                                  {initials(m.nama)}
                                </span>
                                <span style={{ fontSize: 12.5, marginLeft: 6 }}>{m.nama}</span>
                                <span
                                  className={`badge ${STATUS_BADGE[m.status] || "badge-muted"}`}
                                  style={{ fontSize: 10.5, marginTop: 2, display: "inline-block" }}
                                >
                                  {m.status.replace("_", " ").toLowerCase()}
                                </span>
                              </div>
                            ))
                          )}
                        </td>
                        <td>
                          {p.asdos.length === 0 ? (
                            <span className="badge badge-muted">—</span>
                          ) : (
                            p.asdos.map((m: any) => (
                              <div key={m.id} className="team-member-row" style={{ padding: "4px 0" }}>
                                <span className="team-avatar" style={{ width: 24, height: 24, fontSize: 10 }} aria-hidden="true">
                                  {initials(m.nama)}
                                </span>
                                <span style={{ fontSize: 12.5, marginLeft: 6 }}>{m.nama}</span>
                                <span
                                  className={`badge ${STATUS_BADGE[m.status] || "badge-muted"}`}
                                  style={{ fontSize: 10.5, marginTop: 2, display: "inline-block" }}
                                >
                                  {m.status.replace("_", " ").toLowerCase()}
                                </span>
                              </div>
                            ))
                          )}
                        </td>
                        <td className="num">{p.total}</td>
                        <td className="num">
                          <span className={`badge ${p.hadir === p.total && p.total > 0 ? "badge-success" : "badge-muted"}`}>
                            {p.hadir}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard view
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Absensi</h1>
          <p className="page-subtitle">
            Pantau kehadiran instruktur dan asisten dosen per mata kuliah. Klik mata kuliah untuk lihat detail per pertemuan.
          </p>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* KPI Cards */}
      <div className="ops-strip">
        <div className="ops-stat">
          <span className="ops-stat-label">
            <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="calendar" size={14} /></span> Total Sesi
          </span>
          <span className="ops-stat-value">{stats?.totalSessions ?? 0}</span>
          <span className="ops-stat-note">Sesi praktikum dengan absensi</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="users" size={14} /></span> Total Absensi
          </span>
          <span className="ops-stat-value">{stats?.totalAttendance ?? 0}</span>
          <span className="ops-stat-note">Catatan kehadiran tercatat</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="check" size={14} /></span> Tingkat Hadir
          </span>
          <span className="ops-stat-value">{stats?.hadirRate ?? 0}%</span>
          <span className="ops-stat-note">{stats?.hadirCount ?? 0} dari {stats?.totalAttendance ?? 0} hadir</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="book" size={14} /></span> Mata Kuliah
          </span>
          <span className="ops-stat-value">{stats?.courses?.length ?? 0}</span>
          <span className="ops-stat-note">Mata kuliah dengan data absensi</span>
        </div>
      </div>

      {/* Courses list */}
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Data Absensi per Mata Kuliah</h2>
          <p className="card-note" style={{ marginBottom: 12 }}>
            Klik mata kuliah untuk melihat detail kehadiran instruktur dan asisten dosen per pertemuan.
          </p>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Mata Kuliah</th>
                <th>Pertemuan</th>
                <th>Total Absensi</th>
                <th>Hadir</th>
                <th>Tidak Hadir</th>
                <th>Tingkat Hadir</th>
                <th>Instruktur</th>
                <th>Asdos</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty" style={{ padding: 30, textAlign: "center" }}>
                      <Icon name="calendar" size={24} />
                      <p className="empty-title">Belum ada data absensi</p>
                      <p className="empty-text">Catatan kehadiran akan muncul setelah instruktur membuat sesi absensi.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.kode}>
                    <td>
                      <span className="badge badge-muted mono">{c.kode}</span>
                    </td>
                    <td>{c.nama}</td>
                    <td className="num">{c.pertemuanCount}</td>
                    <td className="num">{c.total}</td>
                    <td className="num">
                      <span className={`badge ${c.hadirRate === 100 && c.total > 0 ? "badge-success" : "badge-muted"}`}>
                        {c.hadir}
                      </span>
                    </td>
                    <td className="num">{c.notHadir}</td>
                    <td className="num">
                      <span className={`badge ${c.hadirRate >= 80 ? "badge-success" : c.hadirRate >= 50 ? "badge-warning" : "badge-danger"}`}>
                        {c.hadirRate}%
                      </span>
                    </td>
                    <td className="num">{c.instrukturCount}</td>
                    <td className="num">{c.asdosCount}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openCourse(c)}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", transform: "rotate(90deg)" }}><Icon name="chevron" size={13} /></span> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
