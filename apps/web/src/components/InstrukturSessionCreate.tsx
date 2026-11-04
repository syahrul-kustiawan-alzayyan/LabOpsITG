"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
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

type CourseOption = {
  id: string;
  kode: string;
  nama: string;
  instrukturId: string | null;
  kelas: string[];
  asistenCount: number;
};

type Member = {
  id: string;
  nama: string;
  email: string;
  peran: "INSTRUKTUR" | "ASISTEN_DOSEN";
};

export function InstrukturSessionCreate() {
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [date, setDate] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  const isInstruktur = !!me?.subRoles?.includes("INSTRUKTUR");

  useEffect(() => {
    if (!selectedCourse || !isInstruktur) return;
    const ids = new Set<string>([me?.id]);
    if (selectedCourse.instrukturId) ids.add(selectedCourse.instrukturId);
    // asistenIds tidak ada di CourseOption, akan diisi dari sesi saat dipilih kelas
    // Untuk sementara gunakan data course yang ada
    fetchMembers();
  }, [selectedCourse, isInstruktur, me]);

  async function fetchMembers() {
    if (!selectedCourse || !selectedKelas) {
      setMembers([]);
      return;
    }
    try {
      // Cari jadwal untuk course + kelas hari ini untuk mendapatkan asistenIds
      const day = date || today;
      const hari = new Date(`${day}T00:00:00Z`).getUTCDay();
      const sesis = await api<any[]>(
        `/schedules?mataKuliahId=${selectedCourse.id}&kelas=${encodeURIComponent(selectedKelas)}&hari=${hari}`,
      );
      // Fallback: gunakan course data saja
      const asistenIds: string[] = [];
      const instrukturId = selectedCourse.instrukturId || (me?.subRoles?.includes("INSTRUKTUR") ? me.id : "");

      // Ambil detail user dari course (asistenIds tidak tersedia di CourseOption,
      // jadi kita asumsikan instruktur sendiri + daftar asisten akan diisi dari sesi)
      const memberList: Member[] = [];
      if (instrukturId) {
        memberList.push({ id: instrukturId, nama: me?.nama || "Instruktur", email: me?.email || "", peran: "INSTRUKTUR" });
      }
      // Asisten akan diisi saat kita dapat data jadwal lengkap
      // Untuk sekarang, tampilkan instruktur dan biarkan asisten diisi dari API detail
      setMembers(memberList);
    } catch {
      /* abaikan, akan dimuat ulang saat kelas dipilih */
    }
  }

  function handleCourseChange(course: CourseOption | null) {
    setSelectedCourse(course);
    setSelectedKelas("");
    setMembers([]);
    setDrafts({});
    setQrDataUrl(null);
    setQrResult(null);
  }

  function handleKelasChange(kelas: string) {
    setSelectedKelas(kelas);
    setDrafts({});
    setQrDataUrl(null);
    setQrResult(null);
    fetchMembers();
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
          records,
        },
      });
      setQrResult(data);
      // Generate QR code data URL
      const payload = JSON.stringify({
        token: data.qrToken,
        sesi: data.sesi,
        exp: data.qrExpiresAt,
      });
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: { dark: "#0f4c4c", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setMsg({ type: "success", text: "QR code berhasil dibuat. Tampilkan di layar lab untuk dipindai KM kelas." });
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

  const formattedDate = date || today;

  return (
    <div className="instruktur-session">
      {loading ? (
        <div className="empty" style={{ padding: 40 }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Buat Sesi Absensi</h1>
              <p className="page-subtitle">
                Pilih mata kuliah dan kelas, tandai siapa yang hadir, lalu generate QR code untuk divalidasi KM kelas.
              </p>
            </div>
          </div>

          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

          {/* Form pembuatan sesi */}
          <div className="split-narrow">
            <div className="card">
              <h2 className="card-title">Pilih Mata Kuliah &amp; Kelas</h2>
              <p className="card-note" style={{ marginBottom: 14 }}>
                Pilih mata kuliah yang Anda ampu, lalu pilih kelas yang sedang diajar hari ini.
              </p>

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
                  <label htmlFor="instruktur-date">Tanggal</label>
                  <input
                    id="instruktur-date"
                    type="date"
                    className="input"
                    value={date || today}
                    max={today}
                    onChange={(e) => setDate(e.target.value || today)}
                  />
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

            {/* Hasil QR code */}
            {qrResult && qrDataUrl && (
              <div className="card card-flush">
                <div className="card-head">
                  <h2 className="card-title">QR Code Sesi</h2>
                </div>
                <div className="qr-panel" style={{ textAlign: "center" }}>
                  <div className="qr-wrapper" ref={qrRef}>
                    <img src={qrDataUrl} alt="QR code absensi" style={{ width: 260, height: 260, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} />
                  </div>
                  <div className="qr-info" style={{ marginTop: 14 }}>
                    <p><strong>{qrResult.sesi.mataKuliah}</strong> · Kelas {qrResult.sesi.kelas}</p>
                    <p>{qrResult.sesi.jamMulai}–{qrResult.sesi.jamSelesai} · {qrResult.sesi.lab.kode}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      Berlaku sampai {new Date(qrResult.qrExpiresAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
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
                      }}
                    >
                      <Icon name="close" size={13} /> Buat baru
                    </button>
                  </div>
                  <div className="qr-hint" style={{ marginTop: 10, fontSize: 12, color: "var(--ink-soft)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon name="info" size={14} />
                      KM kelas memindai QR ini dari layar lab untuk memvalidasi kehadiran.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
