"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

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
  members: Array<{ id: string; nama: string; status: string; validated: boolean }>;
};

function fmtTimeRange(mulai: string, selesai: string) {
  return `${mulai}–${selesai}`;
}

function fmtDateIndo(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MatakuliahSayaPage() {
  const [me, setMe] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [meRes, courseRes, sessionRes] = await Promise.all([
        api<{ user: any }>("/auth/me"),
        api<Course[]>("/attendance/instruktur/courses"),
        api<SessionGroup[]>("/attendance/instruktur/sessions"),
      ]);
      setMe(meRes.user);
      setCourses(courseRes);
      setSessions(sessionRes);
    } catch (e: any) {
      setMsg({ type: "danger", text: e?.message || "Gagal memuat data mata kuliah." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mySubRoles = me?.subRoles ?? [];
  const isInstruktur = mySubRoles.includes("INSTRUKTUR");
  const isAsdos = mySubRoles.includes("ASISTEN_DOSEN");
  const myId = me?.id;

  // Mahasiswa (USER tanpa subRole INSTRUKTUR/ASISTEN_DOSEN) tidak boleh mengakses halaman ini
  useEffect(() => {
    if (me && me.role === "USER" && !isInstruktur && !isAsdos) {
      router.replace("/dashboard?denied=1");
    }
  }, [me, isInstruktur, isAsdos, router]);

  // Build session stats per course
  const sessionStats = useMemo(() => {
    const map = new Map<string, { total: number; hadir: number; validated: number; lastTanggal: string | null }>();
    for (const s of sessions) {
      if (!map.has(s.mataKuliahId)) {
        map.set(s.mataKuliahId, { total: 0, hadir: 0, validated: 0, lastTanggal: null });
      }
      const st = map.get(s.mataKuliahId)!;
      st.total += s.total;
      st.hadir += s.hadir;
      st.validated += s.validated;
      if (s.tanggal && (!st.lastTanggal || s.tanggal > st.lastTanggal)) {
        st.lastTanggal = s.tanggal;
      }
    }
    return map;
  }, [sessions]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.kode?.toLowerCase().includes(q) ||
        c.nama?.toLowerCase().includes(q) ||
        c.kelas.some((k) => k.toLowerCase().includes(q)),
    );
  }, [courses, search]);

  const greeting = me?.nama ? me.nama.split(" ")[0] : "Rekan";

  return (
    <>
      <div className="page-header">
        <div>
          <p className="hero-eyebrow" style={{ marginBottom: 6 }}>
            Data mata kuliah per pengajar
          </p>
          <h1 className="page-title">Selamat datang, {greeting}</h1>
          <p className="page-subtitle">
            Berikut mata kuliah yang Anda ampuni atau asisteni, dengan jadwal, tim pengajar,
            dan ringkasan absensi per mata kuliah.
          </p>
        </div>
        <div className="page-actions">
          {isInstruktur && (
            <Link href="/attendance" className="btn btn-secondary">
              <Icon name="qr" size={16} /> Buat sesi absensi
            </Link>
          )}
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} role="alert" style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          id="mk-search"
          className="input"
          placeholder="Cari mata kuliah atau kelas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="ops-strip">
          {[0, 1, 2, 3].map((i) => (
            <div className="ops-stat" key={i}>
              <div className="skeleton" style={{ width: "55%" }} />
              <div className="skeleton" style={{ width: "35%", height: 26, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty" style={{ padding: "40px 24px", textAlign: "center" }}>
          <Icon name="book" size={32} />
          <p className="empty-title">Belum ada mata kuliah</p>
          <p className="empty-text">
            Anda belum tercatat sebagai instruktur atau asisten dosen pada mata kuliah aktif.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {visible.map((course) => {
            const stats = sessionStats.get(course.id);
            const hadirPct = stats?.total ? Math.round((stats.hadir / stats.total) * 100) : 0;
            const myTeam = course.team.find((t) => t.id === myId);
            const myRole = myTeam?.peran ?? (isInstruktur ? "INSTRUKTUR" : "ASISTEN_DOSEN");

            return (
              <div key={course.id} className="card mk-card">
                <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                  <div>
                    <h3 className="card-title" style={{ margin: 0, fontSize: 17 }}>
                      {course.kode} · {course.nama}
                    </h3>
                    <p className="card-note" style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--ink-soft)" }}>
                      {myRole === "INSTRUKTUR" ? "Instruktur pengampu" : "Asisten dosen"} · {course.kelas.length} kelas
                    </p>
                  </div>
                  <span className={`badge ${myRole === "INSTRUKTUR" ? "badge-info" : "badge-muted"}`}>
                    {myRole === "INSTRUKTUR" ? "Instruktur" : "Asdos"}
                  </span>
                </div>

                <div style={{ padding: "14px 22px 10px", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <p className="card-note" style={{ margin: "0 0 6px", fontSize: 13, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Jadwal hari ini
                    </p>
                    {course.jadwalHariIni.length === 0 ? (
                      <p className="card-note" style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
                        Tidak ada jadwal hari ini
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {course.jadwalHariIni.map((j, idx) => (
                          <div key={idx} style={{ fontSize: 13.5, color: "var(--ink)" }}>
                            {j.kelas} · {fmtTimeRange(j.jamMulai, j.jamSelesai)}
                            {j.labKode && ` · ${j.labKode}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="card-note" style={{ margin: "0 0 6px", fontSize: 13, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Kelas
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {course.kelas.map((k) => (
                        <span key={k} className="badge badge-plain" style={{ fontSize: 12.5 }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "10px 22px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
                      {stats?.total ?? 0} sesi
                    </div>
                    <div>
                      {hadirPct}% hadir ({stats?.hadir ?? 0} / {stats?.total ?? 0})
                    </div>
                    {stats?.lastTanggal && (
                      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                        Terakhir: {fmtDateIndo(stats.lastTanggal)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {isInstruktur && (
                      <Link href={`/attendance`} className="btn btn-sm btn-secondary">
                        <Icon name="qr" size={13} /> Buat sesi
                      </Link>
                    )}
                    <Link href={`/schedules`} className="btn btn-sm btn-secondary">
                      <Icon name="calendar" size={13} /> Jadwal
                    </Link>
                  </div>
                </div>

                {/* Team info collapsible-ish, shown as small text */}
                <div style={{ padding: "10px 22px 16px", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-soft)" }}>
                  <strong style={{ color: "var(--ink)" }}>Tim:</strong>{" "}
                  {course.team
                    .map((t) => {
                      const mark = t.id === myId ? " (Anda)" : "";
                      return `${t.nama} (${t.peran})${mark}`;
                    })
                    .join(" · ")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
