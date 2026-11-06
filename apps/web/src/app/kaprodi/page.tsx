"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, withPeriode } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { labDisplayName, labRoom } from "@/lib/lab-label";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const STATUS_LABEL: Record<string, string> = {
  BARU: "Baru",
  DIVERIFIKASI: "Diverifikasi",
  DALAM_PENANGANAN: "Ditangani",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

const BADGE_ISSUE: Record<string, string> = {
  BARU: "badge-warning",
  DIVERIFIKASI: "badge-info",
  DALAM_PENANGANAN: "badge-info",
  SELESAI: "badge-success",
  DITOLAK: "badge-danger",
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function KaprodiPage() {
  const [me, setMe] = useState<any>(null);
  const [prodi, setProdi] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await api<{ user: any }>("/auth/me");
      if (!meRes.user) return;
      setMe(meRes.user);

      const prodiId = meRes.user.prodiId;
      if (!prodiId) {
        setMsg("Akun Anda belum terhubung dengan prodi apa pun. Hubungi admin sistem.");
        setLoading(false);
        return;
      }

      const per = withPeriode({});
      const coursesUrl = `/courses?prodiId=${prodiId}` + (Object.keys(per).length ? "&" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const attUrl = `/attendance` + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const [p, cs, st, iss, att, lb] = await Promise.all([
        api<any>(`/prodi/${prodiId}`),
        api<any[]>(coursesUrl).catch(() => []),
        api<any[]>(`/users?role=KAPRODI&prodiId=${prodiId}`).catch(() => []),
        api<any[]>(`/issues`).catch(() => []),
        api<any[]>(attUrl).catch(() => []),
        api<any[]>("/labs").catch(() => []),
      ]);
      setProdi(p);
      setCourses(cs);
      setStaff(st);
      setIssues(iss.filter((i: any) => i.lab && !["SELESAI", "DITOLAK"].includes(i.status)));
      setAttendance(att);
      setLabs(lb);
    } catch (e: any) {
      setMsg(e?.message || "Tidak dapat memuat dasbor kaprodi.");
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  // Muat ulang data saat periode diganti dari sidebar
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("labops:periode-changed", handler);
    return () => window.removeEventListener("labops:periode-changed", handler);
  }, [load]);

  const openIssues = issues.filter((i: any) => !["SELESAI", "DITOLAK"].includes(i.status));
  const overdueIssues = openIssues.filter((i: any) => i.dueAt && new Date(i.dueAt) < new Date(new Date().toDateString()));

  // Kursus dari prodi ini, ambil jadwal unik dan lab yang terpakai
  const courseLabs = useMemo(() => {
    const labIds = new Set<string>();
    for (const c of courses) {
      for (const s of (c.kelas || [])) {
        if (s.labId) labIds.add(s.labId);
      }
    }
    return labs.filter((l: any) => labIds.has(l.id));
  }, [courses, labs]);

  const totalSks = courses.reduce((sum, c: any) => sum + (c.sks || 0), 0);
  const totalKelas = courses.reduce((sum, c: any) => sum + (c.kelas?.length || 0), 0);
  const instructors = staff.filter((s: any) => s.role === "INSTRUKTUR");
  const asistens = staff.filter((s: any) => s.role === "ASISTEN_DOSEN");

  const attendanceTotal = attendance.length;
  const attendanceHadir = attendance.filter((a: any) => a.status === "HADIR" || a.status === "TERLAMBAT").length;
  const attendanceRate = attendanceTotal ? Math.round((attendanceHadir / attendanceTotal) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <p className="hero-eyebrow" style={{ marginBottom: 6 }}>
            Dasbor Kepala Prodi
          </p>
          <h1 className="page-title">Selamat datang, {me?.nama}</h1>
          <p className="page-subtitle">
            Pantau mata kuliah, jadwal praktikum, rekap absensi, dan kendala untuk prodi {prodi?.nama}.
          </p>
        </div>
        <div className="page-actions">
          {prodi && (
            <Link href={`/prodi/${prodi.id}`} className="btn btn-secondary">
              <Icon name="chevron" size={16} /> Kelola Prodi
            </Link>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-danger">{msg}</div>}

      {!prodi && loading ? (
        <div className="ops-strip reveal">
          {[0, 1, 2, 3].map((i) => (
            <div className="ops-stat" key={i}>
              <div className="skeleton" style={{ width: "55%" }} />
              <div className="skeleton" style={{ width: "35%", height: 26, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : prodi ? (
        <>
          <div className="ops-strip reveal">
            <div className="ops-stat">
              <span className="ops-stat-label">
                <Icon name="book" size={14} /> Mata Kuliah
              </span>
              <span className="ops-stat-value">{courses.length}</span>
              <span className="ops-stat-note">{totalKelas} kelas · {totalSks} SKS</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-label">
                <Icon name="users" size={14} /> Instruktur & Asdos
              </span>
              <span className="ops-stat-value">{instructors.length + asistens.length}</span>
              <span className="ops-stat-note">{instructors.length} instruktur · {asistens.length} asdos</span>
            </div>
            <div className={`ops-stat ${openIssues.length ? "is-alert" : ""}`}>
              <span className="ops-stat-label">
                <Icon name="issue" size={14} /> Kendala Terbuka
              </span>
              <span className="ops-stat-value">{openIssues.length}</span>
              <span className="ops-stat-note">{overdueIssues.length} melewati tenggat</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-label">
                <Icon name="attendance" size={14} /> Tingkat Kehadiran
              </span>
              <span className="ops-stat-value">{attendanceRate}%</span>
              <span className="ops-stat-note">{attendanceHadir} dari {attendanceTotal} catatan</span>
            </div>
          </div>

          <div className="split-narrow">
            <div className="card reveal reveal-2">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Mata Kuliah {prodi.nama}</h2>
                  <p className="card-note">Daftar mata kuliah yang dikelola dalam prodi ini.</p>
                </div>
                <Link href="/courses" className="btn btn-secondary btn-sm">
                  Semua <Icon name="chevron" size={13} />
                </Link>
              </div>
              <div className="table-wrap" style={{ border: "none" }}>
                <table className="table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>SKS</th>
                      <th>Kelas</th>
                      <th>Instruktur</th>
                      <th>Asisten</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty" style={{ padding: 24 }}>
                            <Icon name="book" size={24} />
                            <p className="empty-title">Belum ada mata kuliah</p>
                            <p className="empty-text">Tambahkan mata kuliah untuk prodi ini.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      courses.map((c: any) => (
                        <tr key={c.id}>
                          <td className="num" style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                            {c.kode}
                          </td>
                          <td>{c.nama}</td>
                          <td className="num">{c.sks}</td>
                          <td className="num">{c.kelas?.length || 0}</td>
                          <td>{c.instruktur?.nama || "—"}</td>
                          <td className="num">{c.asisten?.length || 0}</td>
                          <td>
                            <span className={`badge ${c.status === "AKTIF" ? "badge-success" : "badge-muted"}`}>
                              {c.status === "AKTIF" ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card reveal reveal-2">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Instruktur & Asisten Dosen</h2>
                  <p className="card-note">Tim pengajar yang tergabung dalam prodi ini.</p>
                </div>
              </div>
              <div className="table-wrap" style={{ border: "none" }}>
                <table className="table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Peran</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="empty" style={{ padding: 24 }}>
                            <Icon name="staff" size={24} />
                            <p className="empty-title">Belum ada pengajar</p>
                            <p className="empty-text">Tidak ada instruktur atau asisten dosen pada prodi ini.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      staff.map((s: any) => (
                        <tr key={s.id}>
                          <td>{s.nama}</td>
                          <td className="num" style={{ fontSize: 13, color: "var(--ink-soft)" }}>{s.email}</td>
                          <td>
                            <span className={`badge ${s.role === "INSTRUKTUR" ? "badge-info" : "badge-plain"}`}>
                              {s.role === "INSTRUKTUR" ? "Instruktur" : "Asisten Dosen"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${s.status === "ACTIVE" ? "badge-success" : "badge-muted"}`}>
                              {s.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
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

          <div className="card reveal" style={{ marginTop: 16 }}>
            <div className="card-head">
              <div>
                <h2 className="card-title">Kendala Perlu Ditangani</h2>
                <p className="card-note">Laporan kendala terkait praktikum di prodi Anda.</p>
              </div>
              <Link href="/issues" className="btn btn-secondary btn-sm">
                Kelola <Icon name="chevron" size={13} />
              </Link>
            </div>
            <div className="popover-list" style={{ maxHeight: 340 }}>
              {openIssues.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}>
                  <Icon name="check" size={22} />
                  <p className="empty-title">Tidak ada kendala terbuka</p>
                  <p className="empty-text">Seluruh tiket sudah selesai atau ditolak.</p>
                </div>
              ) : (
                openIssues
                  .slice()
                  .sort((a: any, b: any) => new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime())
                  .slice(0, 6)
                  .map((i: any) => {
                    const overdue = i.dueAt && new Date(i.dueAt) < new Date(new Date().toDateString());
                    return (
                      <div key={i.id} className="notif" style={{ cursor: "default" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{i.nomorTiket}</strong>
                          <span className={`badge ${i.urgensi === "TINGGI" ? "badge-danger" : i.urgensi === "SEDANG" ? "badge-warning" : "badge-muted"}`}>
                            {i.urgensi.toLowerCase()}
                          </span>
                        </div>
                        <div style={{ marginTop: 2 }}>{i.deskripsi}</div>
                        <span className="notif-meta">
                          <span>{i.lab?.kode} · {STATUS_LABEL[i.status] || i.status}</span>
                          <span style={{ color: overdue ? "var(--danger)" : undefined }}>{overdue ? "lewat tenggat" : "dalam tenggat"}</span>
                        </span>
                      </div>
                    );
                  })
              )}
              <div className="popover-foot">
                <span>{openIssues.length} tiket terbuka</span>
                <Link href="/issues">Buka daftar kendala</Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
