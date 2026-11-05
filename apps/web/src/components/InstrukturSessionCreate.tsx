"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import QRCode from "qrcode";

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

type CourseOption = {
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
    peran: "INSTRUKTUR" | "ASISTEN_DOSEN";
  }>;
};

type Member = {
  id: string;
  nama: string;
  email: string;
  peran: "INSTRUKTUR" | "ASISTEN_DOSEN";
};

type SessionItem = {
  key: string;
  sesiId: string;
  mataKuliahId: string | null;
  mataKuliah: string;
  kelas: string;
  labKode: string | null;
  jamMulai: string;
  jamSelesai: string;
  tanggal: string | null;
  pertemuanKe: number | null;
  materi: string | null;
  total: number;
  hadir: number;
  validated: number;
  members: Array<{ id: string; nama: string; status: string; validated: boolean }>;
};

export default function InstrukturAttendance() {
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [date, setDate] = useState("");
  const [pertemuanKe, setPertemuanKe] = useState(1);
  const [materi, setMateri] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [history, setHistory] = useState<SessionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, cs] = await Promise.all([
        api<{ user: any }>("/auth/me"),
        api<CourseOption[]>("/attendance/instruktur/courses"),
      ]);
      setMe(m.user);
      setCourses(cs);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api<SessionItem[]>("/attendance/instruktur/sessions");
      setHistory(data);
    } catch {
      /* abaikan */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  const isInstruktur = !!me?.subRoles?.includes("INSTRUKTUR");

  useEffect(() => {
    if (!selectedCourse || !selectedKelas || !isInstruktur) return;
    setMembers([]);
    setDrafts({});
    setQrDataUrl(null);
    setQrResult(null);

    // Bangun daftar anggota dari course.team
    const teamMap = new Map<string, Member>();
    for (const t of selectedCourse.team) {
      teamMap.set(t.id, { id: t.id, nama: t.nama, email: t.email, peran: t.peran });
    }
    // Pastikan instruktur yang login selalu ada
    if (me.id && !teamMap.has(me.id)) {
      teamMap.set(me.id, { id: me.id, nama: me.nama, email: me.email, peran: "INSTRUKTUR" });
    }

    const memberList: Member[] = [...teamMap.values()];
    memberList.sort((a, b) => (a.peran === b.peran ? 0 : a.peran === "INSTRUKTUR" ? -1 : 1));
    setMembers(memberList);
  }, [selectedCourse, selectedKelas, isInstruktur, me]);

  function handleCourseChange(course: CourseOption | null) {
    setSelectedCourse(course);
    setMembers([]);
    setDrafts({});
    setMateri("");
    setQrDataUrl(null);
    setQrResult(null);

    // Jika hanya ada satu kelas berjadwal hari ini, langsung pilihkan.
    const todaySchedules = course?.jadwalHariIni ?? [];
    if (course && todaySchedules.length === 1) {
      const kelas = todaySchedules[0].kelas;
      setSelectedKelas(kelas);
      setPertemuanKe(nextPertemuan(course.id, kelas));
    } else {
      setSelectedKelas("");
      setPertemuanKe(1);
    }
  }

  function nextPertemuan(courseId: string, kelas: string) {
    const max = history
      .filter((h) => h.mataKuliahId === courseId && h.kelas === kelas)
      .reduce((acc, h) => Math.max(acc, h.pertemuanKe ?? 0), 0);
    return max + 1;
  }

  async function handleKelasChange(kelas: string) {
    setSelectedKelas(kelas);
    setDrafts({});
    setPertemuanKe(kelas && selectedCourse ? nextPertemuan(selectedCourse.id, kelas) : 1);
    setMateri("");
    setQrDataUrl(null);
    setQrResult(null);
    // fetchMembers dipakai via useEffect
  }

  function setMemberStatus(userId: string, status: string) {
    setDrafts((prev) => ({ ...prev, [userId]: status }));
  }

  async function generateQr() {
    if (!selectedCourse || !selectedKelas || !me) return;
    setSaving(true);
    setMsg(null);
    try {
      const records = members.map((m) => ({
        userId: m.id,
        status: drafts[m.id] || "HADIR",
      }));
      const data = await api<any>("/attendance/instruktur/session", {
        method: "POST",
        body: {
          mataKuliahId: selectedCourse.id,
          kelas: selectedKelas,
          tanggal: date || today,
          pertemuanKe: pertemuanKe,
          materi: materi || null,
          records,
        },
      });
      setQrResult(data);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const validateUrl = `${baseUrl}/attendance/validate?token=${encodeURIComponent(data.qrToken)}`;
      const dataUrl = await QRCode.toDataURL(validateUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#0f4c4c", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setMsg({ type: "success", text: "QR code berhasil dibuat. Tampilkan di layar lab untuk dipindai KM kelas." });
      await loadHistory();
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `qr-absensi-${selectedCourse?.kode}-${selectedKelas}.png`;
    link.href = qrDataUrl;
    link.click();
  }

  return (
    <div className="instruktur-attendance">
      {loading ? (
        <div className="empty" style={{ padding: 60, textAlign: "center" }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 14, margin: "0 auto", maxWidth: 400 }} />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Absensi Instruktur</h1>
              <p className="page-subtitle">
                Pilih mata kuliah dan kelas yang sedang Anda ajar, tandai kehadiran tim pengajar,
                lalu generate QR code untuk divalidasi KM kelas.
              </p>
            </div>
            <div className="page-actions">
              <Link href="/schedules" className="btn btn-secondary">
                <Icon name="calendar" size={14} /> Lihat Jadwal
              </Link>
            </div>
          </div>

          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

          {/* KPI Ringkasan */}
          <div className="ops-strip">
            <div className="ops-stat">
              <span className="ops-stat-label">
                <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="book" size={14} /></span> Mata Kuliah
              </span>
              <span className="ops-stat-value">{courses.length}</span>
              <span className="ops-stat-note">Mata kuliah yang Anda ampu</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-label">
                <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="calendar" size={14} /></span> Sesi Dibuat
              </span>
              <span className="ops-stat-value">{history.length}</span>
              <span className="ops-stat-note">Sesi absensi tercatat</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-label">
                <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="check" size={14} /></span> Kehadiran Tim
              </span>
              <span className="ops-stat-value">
                {history.reduce((sum, h) => sum + h.hadir, 0)}
                <span style={{ fontSize: 15, color: "var(--ink-soft)", fontWeight: 500 }}>
                  /{history.reduce((sum, h) => sum + h.total, 0)}
                </span>
              </span>
              <span className="ops-stat-note">Hadir dari total catatan anggota</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-label">
                <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><Icon name="qr" size={14} /></span> Menunggu Validasi
              </span>
              <span className="ops-stat-value">
                {history.filter((h) => h.validated < h.total).length}
              </span>
              <span className="ops-stat-note">Belum dipindai KM kelas</span>
            </div>
          </div>

          <div className="split-narrow">
            {/* Kolom kiri: Form buat sesi */}
            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Buat Sesi Absensi</h2>
                <p className="card-note" style={{ marginBottom: 14 }}>
                  Pilih mata kuliah, kelas, dan tanggal. Tandai anggota tim yang hadir.
                </p>
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="instruktur-course">Mata kuliah</label>
                <select
                  id="instruktur-course"
                  className="input"
                  value={selectedCourse?.id || ""}
                  onChange={(e) => {
                    const c = courses.find((x) => x.id === e.target.value);
                    handleCourseChange(c || null);
                  }}
                >
                  <option value="">Pilih mata kuliah…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.kode} — {c.nama} ({c.asistenCount} asisten)
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourse && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label htmlFor="instruktur-date">Tanggal pertemuan</label>
                  <input
                    id="instruktur-date"
                    type="date"
                    className="input"
                    value={date || today}
                    max={today}
                    onChange={(e) => setDate(e.target.value || today)}
                  />
                  <span className="field-hint">
                    Pilih tanggal pelaksanaan. Jadwal praktikum harus tersedia pada hari tersebut.
                  </span>
                </div>
              )}

              {selectedCourse && (date || today) === today && (
                selectedCourse.jadwalHariIni.length > 0 ? (
                  <div
                    className="field-hint"
                    style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: -4, marginBottom: 10 }}
                  >
                    <Icon name="calendar" size={13} />
                    Jadwal hari ini:
                    {selectedCourse.jadwalHariIni.map((j) => (
                      <span key={`${j.kelas}-${j.jamMulai}`}>
                        Kelas {j.kelas} · {j.jamMulai}–{j.jamSelesai}
                        {j.labKode ? ` · ${j.labKode}` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-warning" style={{ marginBottom: 12, padding: "8px 12px", fontSize: 13 }}>
                    Tidak ada jadwal untuk mata kuliah ini hari ini. Pilih tanggal yang sesuai jadwal praktikum.
                  </div>
                )
              )}

              {selectedCourse && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label htmlFor="instruktur-kelas">Kelas</label>
                  <select
                    id="instruktur-kelas"
                    className="input"
                    value={selectedKelas}
                    onChange={(e) => handleKelasChange(e.target.value)}
                    disabled={!selectedCourse}
                  >
                    <option value="">Pilih kelas…</option>
                    {selectedCourse.kelas.map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCourse && selectedKelas && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label htmlFor="instruktur-pertemuan-ke">Pertemuan ke-</label>
                  <input
                    id="instruktur-pertemuan-ke"
                    type="number"
                    className="input"
                    min="1"
                    max="50"
                    value={pertemuanKe}
                    onChange={(e) => setPertemuanKe(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <span className="field-hint">
                    Terisi otomatis dari pertemuan terakhir mata kuliah ini. Ubah bila perlu mengoreksi sesi yang sudah ada.
                  </span>
                </div>
              )}

              {selectedCourse && selectedKelas && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label htmlFor="instruktur-materi">Materi Ajar</label>
                  <textarea
                    id="instruktur-materi"
                    className="input"
                    rows={3}
                    value={materi}
                    onChange={(e) => setMateri(e.target.value)}
                    placeholder="Deskripsi materi atau tautan ke materi ajar"
                  />
                  <span className="field-hint">Materi yang dibahas pada pertemuan ini.</span>
                </div>
              )}

              {selectedCourse && selectedKelas && members.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "var(--ink-soft)" }}>
                    Anggota Tim Pengajar
                  </h3>
                  <div className="team-member-list">
                    {members.map((m) => (
                      <div key={m.id} className="team-member-row">
                        <span className="team-avatar" aria-hidden="true">{initials(m.nama)}</span>
                        <div className="team-member-info">
                          <strong>{m.nama}</strong>
                          <span>{PERAN_LABEL[m.peran] || m.peran}</span>
                        </div>
                        <select
                          className="input team-status-select"
                          aria-label={`Status ${m.nama}`}
                          value={drafts[m.id] || "HADIR"}
                          onChange={(e) => setMemberStatus(m.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCourse && selectedKelas && members.length === 0 && (
                <div className="empty" style={{ padding: 16, textAlign: "center" }}>
                  <p className="empty-text">Anggota tim akan muncul setelah kelas dipilih.</p>
                </div>
              )}

              <button
                className="btn btn-full"
                onClick={generateQr}
                disabled={saving || !selectedCourse || !selectedKelas || members.length === 0}
              >
                {saving ? "Membuat sesi…" : "Generate QR Code"}
              </button>
            </div>

            {/* Kolom kanan: Hasil QR + Riwayat */}
            <div className="card card-flush">
              {qrResult && qrDataUrl && (
                <>
                  <div className="card-head">
                    <h2 className="card-title">QR Code Sesi</h2>
                  </div>
                  <div className="qr-panel" style={{ textAlign: "center" }}>
                    <div className="qr-wrapper">
                      <img src={qrDataUrl} alt="QR code absensi" style={{ width: 260, height: 260, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} />
                    </div>
                    <div className="qr-info" style={{ marginTop: 14 }}>
                      <p><strong>{qrResult.sesi.mataKuliah}</strong> · Kelas {qrResult.sesi.kelas}</p>
                      <p>{qrResult.sesi.jamMulai}–{qrResult.sesi.jamSelesai} · {qrResult.sesi.lab.kode}</p>
                      <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        Berlaku sampai {new Date(qrResult.qrExpiresAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {qrResult.materi && (
                        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                          <strong>Materi:</strong> {qrResult.materi}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        {qrResult.marked} anggota tim telah ditandai
                      </p>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button className="btn btn-secondary btn-sm" onClick={downloadQr} disabled={!qrDataUrl}>
                        <Icon name="external" size={13} /> Unduh QR
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setQrDataUrl(null);
                          setQrResult(null);
                          setMsg(null);
                          if (selectedCourse && selectedKelas) {
                            setPertemuanKe(nextPertemuan(selectedCourse.id, selectedKelas));
                          }
                          loadHistory();
                        }}
                      >
                        <Icon name="close" size={13} /> Buat baru
                      </button>
                    </div>
                    <div className="qr-hint" style={{ marginTop: 10, fontSize: 12, color: "var(--ink-soft)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Icon name="info" size={14} />
                        KM kelas memindai gambar QR ini dengan kamera ponsel untuk membuka halaman validasi.
                      </span>
                    </div>
                  </div>
                </>
              )}

              {!qrResult && (
                <>
                  <div className="card-head">
                    <h2 className="card-title">Riwayat Sesi Terbaru</h2>
                    <p className="card-note">{history.length} sesi absensi tim pengajar</p>
                  </div>
                  <div style={{ maxHeight: 480, overflowY: "auto" }}>
                    {historyLoading ? (
                      <div style={{ padding: 16 }}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="skeleton" style={{ height: 64, marginBottom: 10 }} />
                        ))}
                      </div>
                    ) : history.length === 0 ? (
                      <div className="empty" style={{ padding: 30, textAlign: "center" }}>
                        <Icon name="attendance" size={22} />
                        <p className="empty-title">Belum ada sesi</p>
                        <p className="empty-text">Sesi absensi yang Anda buat akan muncul di sini.</p>
                      </div>
                    ) : (
                      history.map((s) => {
                        const fullyValidated = s.total > 0 && s.validated >= s.total;
                        return (
                          <div key={s.key} className="notif" style={{ cursor: "default" }}>
                            <div className="session-item">
                              <div className="session-main">
                                <strong>{s.mataKuliah}</strong>
                                <div className="notif-meta">
                                  <span>
                                    Kelas {s.kelas}
                                    {s.pertemuanKe != null ? ` · Pertemuan ${s.pertemuanKe}` : ""}
                                  </span>
                                  <span>{formatTanggal(s.tanggal)}</span>
                                </div>
                                {s.materi && (
                                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
                                    {s.materi}
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                                  {s.members.map((m) => (
                                    <span
                                      key={m.id}
                                      className={`badge ${STATUS_BADGE[m.status] || "badge-muted"}`}
                                      style={{ fontSize: 10.5 }}
                                    >
                                      {m.nama.split(" ")[0]} · {m.status.replace("_", " ").toLowerCase()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <span className={`badge ${fullyValidated ? "badge-success" : "badge-plain"}`}>
                                  {fullyValidated ? "Tervalidasi KM" : "Menunggu KM"}
                                </span>
                                <div className="card-note" style={{ marginTop: 6, fontSize: 11.5, whiteSpace: "nowrap" }}>
                                  {s.hadir}/{s.total} hadir
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
