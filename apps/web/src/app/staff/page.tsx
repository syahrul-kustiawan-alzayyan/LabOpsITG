"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function StaffPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [editSesi, setEditSesi] = useState<any>(null);
  const [pengampuId, setPengampuId] = useState("");
  const [asistenIds, setAsistenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isCoord = me && ["ADMIN_SYSTEM", "COORDINATOR"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, meRes, schedRes] = await Promise.all([
        api<any[]>("/courses").catch(() => []),
        api<{ user: any }>("/auth/me"),
        api<any[]>("/schedules").catch(() => []),
      ]);
      const meUser = meRes.user;
      let userRes: any[] = [];
      if (["ADMIN_SYSTEM", "COORDINATOR"].includes(meUser?.role ?? "")) {
        userRes = await api<any[]>("/users?pageSize=100").catch(() => []);
      }
      setCourses(courseRes);
      setMe(meUser);
      setSchedules(schedRes);
      setUsers(userRes);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Build per-course instructor/asisten summary from course data (link from recruitment)
  const courseStaff = useMemo(() => {
    const map: Record<string, {
      kode: string;
      nama: string;
      instruktur: { id: string; nama: string; email: string } | null;
      asisten: { id: string; nama: string; email: string }[];
      schedules: number;
    }> = {};
    for (const c of courses) {
      map[c.id] = {
        kode: c.kode,
        nama: c.nama,
        instruktur: c.instruktur || null,
        asisten: (c.asisten || []).map((a: any) => ({ id: a.id, nama: a.nama, email: a.email })),
        schedules: c.schedules?.filter((s: any) => !s.deletedAt).length || 0,
      };
    }
    return Object.values(map).sort((a, b) => a.kode.localeCompare(b.kode));
  }, [courses]);

  const instructors = users.filter((u) => u.subRoles?.includes("INSTRUKTUR") || u.role === "INSTRUKTUR" || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role));
  const assistants = users.filter((u) => u.subRoles?.includes("ASISTEN_DOSEN") || u.role === "ASISTEN_DOSEN" || u.subRoles?.includes("INSTRUKTUR") || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role));

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && !filterCourse) return courseStaff;
    return courseStaff.filter((c) => {
      if (filterCourse && c.kode !== filterCourse && c.nama !== filterCourse) return false;
      if (!q) return true;
      return c.kode?.toLowerCase().includes(q) || c.nama?.toLowerCase().includes(q);
    });
  }, [courseStaff, search, filterCourse]);

  // Schedule-based view for editing assignments
  const HARI_MAP = HARI;
  const groupedSchedules: Record<number, any[]> = {};
  for (const s of schedules) {
    if (!groupedSchedules[s.hari]) groupedSchedules[s.hari] = [];
    groupedSchedules[s.hari].push(s);
  }

  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((s) => {
      if (filterCourse && s.mataKuliah !== filterCourse) return false;
      if (!q) return true;
      return (
        s.mataKuliah?.toLowerCase().includes(q) ||
        s.kelas?.toLowerCase().includes(q) ||
        s.pengampu?.nama?.toLowerCase().includes(q) ||
        (s.asisten || []).some((a: any) => a.nama?.toLowerCase().includes(q))
      );
    });
  }, [schedules, search, filterCourse]);

  const unassigned = filteredSchedules.filter((s) => !s.pengampu?.nama).length;

  const greeting = me?.nama ? me.nama.split(" ")[0] : "Rekan";

  function openEdit(s: any) {
    setEditSesi(s);
    setPengampuId(s.pengampu?.id || s.pengampuId || "");
    setAsistenIds(s.asistenIds || []);
    setMsg(null);
  }

  function toggleAsisten(id: string) {
    setAsistenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (!editSesi) return;
    try {
      await api(`/schedules/${editSesi.id}`, { method: "PUT", body: { pengampuId: pengampuId || null, asistenIds } });
      setMsg({ type: "success", text: "Penugasan sesi disimpan." });
      setEditSesi(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="hero-eyebrow" style={{ marginBottom: 6 }}>
            Data instruktur &amp; asisten dosen
          </p>
          <h1 className="page-title">Selamat datang, {greeting}</h1>
          <p className="page-subtitle">
            Data pengampu dan asisten dosen per mata kuliah. Data ini terisi dari hasil rekrutmen
            yang disetujui koordinator dan dapat ditugaskan ke jadwal praktikum.
          </p>
        </div>
        <div className="page-actions">
          {isCoord && (
            <Link href="/courses" className="btn btn-secondary">
              <Icon name="book" size={16} /> Kelola mata kuliah
            </Link>
          )}
          {isCoord && (
            <Link href="/recruitment?tab=kelola" className="btn">
              <Icon name="recruitment" size={16} /> Kelola rekrutmen
            </Link>
          )}
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} role="status">
          {msg.text}
        </div>
      )}

      <div className="ops-strip reveal">
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="book" size={14} /> Mata kuliah
          </span>
          <span className="ops-stat-value">{courses.length}</span>
          <span className="ops-stat-note">terdaftar di sistem</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="staff" size={14} /> Instruktur pengampu
          </span>
          <span className="ops-stat-value">{courseStaff.filter((c) => c.instruktur).length}</span>
          <span className="ops-stat-note">dengan instruktur ditetapkan</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="users" size={14} /> Asisten dosen
          </span>
          <span className="ops-stat-value">{courseStaff.reduce((sum, c) => sum + c.asisten.length, 0)}</span>
          <span className="ops-stat-note">seluruh mata kuliah</span>
        </div>
        <div className={`ops-stat ${unassigned ? "is-alert" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="calendar" size={14} /> Sesi tanpa pengampu
          </span>
          <span className="ops-stat-value">{unassigned}</span>
          <span className="ops-stat-note">{unassigned ? "perlu ditugaskan" : "semua terisi"}</span>
        </div>
      </div>

      {/* Per-course staff table */}
      <div className="card card-flush reveal reveal-2" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">Instruktur &amp; Asdos per Mata Kuliah</h2>
            <p className="card-note">Data diisi otomatis saat koordinator menyetujui lamaran rekrutmen.</p>
          </div>
          <div className="field" style={{ minWidth: 260, marginLeft: "auto" }}>
            <label htmlFor="sc-search">Cari mata kuliah</label>
            <input id="sc-search" className="input" placeholder="Kode atau nama…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Mata kuliah</th>
                <th>Instruktur pengampu</th>
                <th>Asisten dosen</th>
                <th>Sesi jadwal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="skeleton" style={{ height: 40 }} />
                  </td>
                </tr>
              ) : visibleCourses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty" style={{ padding: 24 }}>
                      <Icon name="users" size={24} />
                      <p className="empty-title">Belum ada data instruktur/asdos</p>
                      <p className="empty-text">
                        Buka lowongan rekrutmen dan setujui calon instruktur/asdos agar muncul di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleCourses.map((c) => (
                  <tr key={c.kode}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 550 }}>{c.kode}</td>
                    <td style={{ fontWeight: 500 }}>{c.nama}</td>
                    <td>
                      {c.instruktur ? (
                        <>
                          <div style={{ fontWeight: 550 }}>{c.instruktur.nama}</div>
                          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{c.instruktur.email}</div>
                        </>
                      ) : (
                        <span style={{ color: "var(--danger)" }}>Belum ditetapkan</span>
                      )}
                    </td>
                    <td>
                      {c.asisten.length > 0 ? (
                        <>
                          {c.asisten.map((a) => (
                            <div key={a.id} style={{ fontSize: 14, marginBottom: 2 }}>
                              {a.nama}
                            </div>
                          ))}
                          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{c.asisten.length} orang</div>
                        </>
                      ) : (
                        <span style={{ color: "var(--ink-soft)" }}>—</span>
                      )}
                    </td>
                    <td className="num">{c.schedules}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule-based assignment (koordinator only) */}
      {isCoord && (
        <>
          <div className="card" style={{ marginBottom: 16, padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field" style={{ flex: "1 1 240px", minWidth: 200 }}>
                <label htmlFor="st-search">Cari sesi jadwal</label>
                <div style={{ position: "relative" }}>
                  <input id="st-search" className="input" placeholder="Mata kuliah, kelas, dosen…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
                  <span style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }}>
                    <Icon name="search" size={15} />
                  </span>
                </div>
              </div>
              <div className="field" style={{ minWidth: 240 }}>
                <label htmlFor="st-course">Mata kuliah</label>
                <select id="st-course" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                  <option value="">Semua mata kuliah</option>
                  {courseStaff.map((c) => (
                    <option key={c.kode} value={c.kode}>
                      {c.kode} — {c.nama}
                    </option>
                  ))}
                </select>
              </div>
              <span className="badge badge-plain" style={{ marginBottom: 8 }}>
                {filteredSchedules.length} sesi jadwal
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Lab</th>
                  <th>Hari</th>
                  <th>Jam</th>
                  <th>Mata kuliah</th>
                  <th>Kelas</th>
                  <th>Instruktur</th>
                  <th>Asisten dosen</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">
                        <Icon name="users" size={24} />
                        <p className="empty-title">Tidak ada sesi yang cocok</p>
                        <p className="empty-text">Ubah kata kunci atau filter mata kuliah.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((s) => (
                    <tr key={s.id}>
                      <td className="num">{s.lab?.kode}</td>
                      <td>{HARI[s.hari]}</td>
                      <td className="num">{s.jamMulai}–{s.jamSelesai}</td>
                      <td>{s.mataKuliah}</td>
                      <td>{s.kelas}</td>
                      <td>{s.pengampu?.nama || <span style={{ color: "var(--danger)" }}>belum ada</span>}</td>
                      <td style={{ fontSize: 15 }}>{(s.asisten || []).map((a: any) => a.nama).join(", ") || "—"}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
                          Atur
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editSesi && isCoord && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Atur penugasan · {editSesi.mataKuliah} ({editSesi.kelas})
              </h3>
              <p className="card-note">
                {editSesi.lab?.kode} · {HARI[editSesi.hari]} · {editSesi.jamMulai}–{editSesi.jamSelesai}
              </p>
            </div>
            <button className="icon-btn" onClick={() => setEditSesi(null)} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="edit-pengampu">Instruktur (pengampu)</label>
              <select id="edit-pengampu" value={pengampuId} onChange={(e) => setPengampuId(e.target.value)}>
                <option value="">Belum ditentukan</option>
                {instructors.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Asisten dosen (bisa lebih dari satu)</label>
            <div className="chip-row">
              {assistants.map((u) => (
                <button key={u.id} type="button" className={`chip ${asistenIds.includes(u.id) ? "is-active" : ""}`} onClick={() => toggleAsisten(u.id)} aria-pressed={asistenIds.includes(u.id)}>
                  {asistenIds.includes(u.id) && <Icon name="check" size={12} />} {u.nama}
                </button>
              ))}
              {assistants.length === 0 && <span className="field-hint">Belum ada akun dengan sub-peran asisten dosen.</span>}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button className="btn" onClick={save}>Simpan penugasan</button>
            <button className="btn btn-secondary" onClick={() => setEditSesi(null)}>Batal</button>
          </div>
        </div>
      )}
    </>
  );
}
