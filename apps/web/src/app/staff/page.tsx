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
  const [filterStaff, setFilterStaff] = useState("");
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

  /** Build instructor-centric structure:
   * instruktur -> [courses they handle] -> each course -> assistants
   */
  const staffByInstruktur = useMemo(() => {
    const map: Record<string, {
      id: string;
      nama: string;
      email: string;
      courses: Array<{
        id: string;
        kode: string;
        nama: string;
        schedules: number;
        asisten: { id: string; nama: string; email: string }[];
      }>;
    }> = {};

    for (const c of courses) {
      const inst = c.instruktur;
      if (!inst) continue; // skip courses without an assigned instructor

      const key = inst.id;
      if (!map[key]) {
        map[key] = {
          id: inst.id,
          nama: inst.nama,
          email: inst.email,
          courses: [],
        };
      }

      map[key].courses.push({
        id: c.id,
        kode: c.kode,
        nama: c.nama,
        schedules: c.schedules?.filter((s: any) => !s.deletedAt).length || 0,
        asisten: (c.asisten || []).map((a: any) => ({ id: a.id, nama: a.nama, email: a.email })),
      });
    }

    return Object.values(map).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [courses]);

  const flatStaff = useMemo(() => {
    // Flatten to (instruktur, course) rows for search/filter
    const rows: Array<{ instruktur: any; course: any }> = [];
    for (const inst of staffByInstruktur) {
      for (const c of inst.courses) {
        rows.push({ instruktur: inst, course: c });
      }
    }
    return rows;
  }, [staffByInstruktur]);

  const visibleStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && !filterStaff) return staffByInstruktur;
    return staffByInstruktur.filter((inst) => {
      if (filterStaff && inst.id !== filterStaff && inst.nama !== filterStaff) return false;
      if (!q) return true;
      const matchInstruktur = inst.nama.toLowerCase().includes(q) || inst.email.toLowerCase().includes(q);
      const matchCourse = inst.courses.some(
        (c) => c.kode.toLowerCase().includes(q) || c.nama.toLowerCase().includes(q)
      );
      const matchAsisten = inst.courses.some((c) =>
        c.asisten.some((a) => a.nama.toLowerCase().includes(q))
      );
      return matchInstruktur || matchCourse || matchAsisten;
    });
  }, [staffByInstruktur, search, filterStaff]);

  // Schedule-based view for editing assignments (koordinator only)
  const groupedSchedules: Record<number, any[]> = {};
  for (const s of schedules) {
    if (!groupedSchedules[s.hari]) groupedSchedules[s.hari] = [];
    groupedSchedules[s.hari].push(s);
  }

  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((s) => {
      if (filterStaff && s.pengampuId !== filterStaff) return false;
      if (!q) return true;
      return (
        s.mataKuliah?.toLowerCase().includes(q) ||
        s.kelas?.toLowerCase().includes(q) ||
        s.pengampu?.nama?.toLowerCase().includes(q) ||
        (s.asisten || []).some((a: any) => a.nama?.toLowerCase().includes(q))
      );
    });
  }, [schedules, search, filterStaff]);

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

  const instructors = users.filter((u) => u.subRoles?.includes("INSTRUKTUR") || u.role === "INSTRUKTUR" || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role));
  const assistants = users.filter((u) => u.subRoles?.includes("ASISTEN_DOSEN") || u.role === "ASISTEN_DOSEN" || u.subRoles?.includes("INSTRUKTUR") || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role));

  return (
    <>
      <div className="page-header">
        <div>
          <p className="hero-eyebrow" style={{ marginBottom: 6 }}>
            Data instruktur &amp; asisten dosen
          </p>
          <h1 className="page-title">Selamat datang, {greeting}</h1>
          <p className="page-subtitle">
            Data pengampu dan asisten dosen per mata kuliah yang diampu. Data ini terisi dari hasil rekrutmen
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
            <Icon name="staff" size={14} /> Instruktur pengampu
          </span>
          <span className="ops-stat-value">{staffByInstruktur.length}</span>
          <span className="ops-stat-note">memegang mata kuliah</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="book" size={14} /> Mata kuliah diampu
          </span>
          <span className="ops-stat-value">{flatStaff.length}</span>
          <span className="ops-stat-note">dengan instruktur ditetapkan</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="users" size={14} /> Asisten dosen
          </span>
          <span className="ops-stat-value">{flatStaff.reduce((sum, r) => sum + r.course.asisten.length, 0)}</span>
          <span className="ops-stat-note">seluruh matkul yang diampu</span>
        </div>
        <div className={`ops-stat ${unassigned ? "is-alert" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="calendar" size={14} /> Sesi tanpa pengampu
          </span>
          <span className="ops-stat-value">{unassigned}</span>
          <span className="ops-stat-note">{unassigned ? "perlu ditugaskan" : "semua terisi"}</span>
        </div>
      </div>

      {/* Instruktur-centric table */}
      <div className="card card-flush reveal reveal-2" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">Instruktur &amp; Mata Kuliah yang Diampu</h2>
            <p className="card-note">Setiap instruktur dengan mata kuliah dan asisten dosen per mata kuliahnya.</p>
          </div>
          <div className="field" style={{ minWidth: 260, marginLeft: "auto" }}>
            <label htmlFor="sc-search">Cari instruktur atau matkul</label>
            <input id="sc-search" className="input" placeholder="Nama, kode, atau matkul…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Instruktur pengampu</th>
                <th>Mata kuliah yang diampu</th>
                <th>Asisten dosen per matkul</th>
                <th>Sesi jadwal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>
                    <div className="skeleton" style={{ height: 40 }} />
                  </td>
                </tr>
              ) : visibleStaff.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty" style={{ padding: 24 }}>
                      <Icon name="users" size={24} />
                      <p className="empty-title">Belum ada instruktur dengan matkul</p>
                      <p className="empty-text">
                        Setujui lamaran rekrutmen instruktur agar muncul di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleStaff.map((inst) => (
                  <tr key={inst.id} style={{ verticalAlign: "top" }}>
                    <td style={{ fontWeight: 550 }}>
                      <div>{inst.nama}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{inst.email}</div>
                    </td>
                    <td>
                      {inst.courses.length === 0 ? (
                        <span style={{ color: "var(--ink-soft)" }}>—</span>
                      ) : (
                        <>
                          {inst.courses.map((c) => (
                            <div key={c.id} style={{ marginBottom: 6 }}>
                              <div style={{ fontWeight: 550, fontFamily: "var(--font-mono)" }}>{c.kode}</div>
                              <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{c.nama}</div>
                              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                                {c.schedules} sesi jadwal
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </td>
                    <td>
                      {inst.courses.length === 0 ? (
                        <span style={{ color: "var(--ink-soft)" }}>—</span>
                      ) : (
                        <>
                          {inst.courses.map((c) => (
                            <div key={c.id} style={{ marginBottom: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c.kode}</div>
                              {c.asisten.length > 0 ? (
                                <>
                                  {c.asisten.map((a) => (
                                    <div key={a.id} style={{ fontSize: 13, marginBottom: 2 }}>
                                      {a.nama}
                                    </div>
                                  ))}
                                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                                    {c.asisten.length} asisten
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                                  Belum ada asisten
                                </span>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </td>
                    <td className="num">
                      {inst.courses.reduce((sum, c) => sum + c.schedules, 0)}
                    </td>
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
                <label htmlFor="st-instruktur">Instruktur</label>
                <select id="st-instruktur" value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
                  <option value="">Semua instruktur</option>
                  {staffByInstruktur.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
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
                        <p className="empty-text">Ubah kata kunci atau filter instruktur.</p>
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
