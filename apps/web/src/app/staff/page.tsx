"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function StaffPage() {
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

  const isCoord = me && ["COORDINATOR", "ADMIN_SYSTEM"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sched, meRes] = await Promise.all([api<any[]>("/schedules"), api<{ user: any }>("/auth/me")]);
      setSchedules(sched);
      setMe(meRes.user);
      if (["COORDINATOR", "ADMIN_SYSTEM"].includes(meRes.user.role)) {
        setUsers(await api<any[]>("/users?pageSize=100").catch(() => []));
      }
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const courses = useMemo(() => {
    const map: Record<string, { sessions: number; pengampu: Set<string>; asisten: Set<string>; labs: Set<string> }> = {};
    for (const s of schedules) {
      if (!map[s.mataKuliah]) map[s.mataKuliah] = { sessions: 0, pengampu: new Set(), asisten: new Set(), labs: new Set() };
      map[s.mataKuliah].sessions += 1;
      if (s.pengampu?.nama) map[s.mataKuliah].pengampu.add(s.pengampu.nama);
      for (const a of s.asisten || []) map[s.mataKuliah].asisten.add(a.nama);
      if (s.lab?.kode) map[s.mataKuliah].labs.add(s.lab.kode);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [schedules]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((s) => {
      if (filterCourse && s.mataKuliah !== filterCourse) return false;
      if (!q) return true;
      return (
        s.mataKuliah?.toLowerCase().includes(q) ||
        s.kelas?.toLowerCase().includes(q) ||
        s.lab?.kode?.toLowerCase().includes(q) ||
        s.pengampu?.nama?.toLowerCase().includes(q) ||
        (s.asisten || []).some((a: any) => a.nama?.toLowerCase().includes(q))
      );
    });
  }, [schedules, search, filterCourse]);

  const instructors = users.filter((u) => u.subRoles?.includes("DOSEN") || u.subRoles?.includes("INSTRUKTUR") || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role));
  const assistants = users.filter((u) => u.subRoles?.includes("ASISTEN_DOSEN") || u.subRoles?.includes("INSTRUKTUR") || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role));

  const unassigned = schedules.filter((s) => !s.pengampu?.nama).length;

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
          <h1 className="page-title">Instruktur & Asisten</h1>
          <p className="page-subtitle">Penugasan pengampu dan asisten dosen per mata kuliah praktikum.</p>
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
            <Icon name="calendar" size={14} /> Sesi praktikum
          </span>
          <span className="ops-stat-value">{schedules.length}</span>
          <span className="ops-stat-note">semester aktif</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="staff" size={14} /> Mata kuliah
          </span>
          <span className="ops-stat-value">{courses.length}</span>
          <span className="ops-stat-note">dengan jadwal lab</span>
        </div>
        <div className={`ops-stat ${unassigned ? "is-alert" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="users" size={14} /> Sesi tanpa pengampu
          </span>
          <span className="ops-stat-value">{unassigned}</span>
          <span className="ops-stat-note">{unassigned ? "perlu ditugaskan" : "semua sesi terisi"}</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="shield" size={14} /> Asisten terdaftar
          </span>
          <span className="ops-stat-value">{assistants.length}</span>
          <span className="ops-stat-note">akun dengan sub-peran asisten</span>
        </div>
      </div>

      <div className="card card-flush reveal" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">Ringkasan per mata kuliah</h2>
            <p className="card-note">Satu mata kuliah dapat memiliki beberapa sesi, lab, dan asisten.</p>
          </div>
          <span className="badge badge-plain">{courses.length} mata kuliah</span>
        </div>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Mata kuliah</th>
                <th>Sesi</th>
                <th>Lab</th>
                <th>Instruktur</th>
                <th>Asisten dosen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="skeleton" style={{ height: 30 }} />
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty" style={{ padding: 24 }}>
                      <p className="empty-text">Belum ada jadwal praktikum.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                courses.map(([mk, info]) => (
                  <tr key={mk}>
                    <td style={{ fontWeight: 500 }}>{mk}</td>
                    <td className="num">{info.sessions}</td>
                    <td className="num">{Array.from(info.labs).join(", ") || "—"}</td>
                    <td>{Array.from(info.pengampu).join(", ") || <span style={{ color: "var(--danger)" }}>belum ada</span>}</td>
                    <td>{Array.from(info.asisten).join(", ") || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 240px", minWidth: 200 }}>
            <label htmlFor="st-search">Cari sesi</label>
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
              {courses.map(([mk]) => (
                <option key={mk} value={mk}>
                  {mk}
                </option>
              ))}
            </select>
          </div>
          <span className="badge badge-plain" style={{ marginBottom: 8 }}>
            {visible.length} sesi
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
              {isCoord && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={isCoord ? 8 : 7}>
                  <div className="empty">
                    <Icon name="users" size={24} />
                    <p className="empty-title">Tidak ada sesi yang cocok</p>
                    <p className="empty-text">Ubah kata kunci atau filter mata kuliah.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((s) => (
                <tr key={s.id}>
                  <td className="num">{s.lab?.kode}</td>
                  <td>{HARI[s.hari]}</td>
                  <td className="num">
                    {s.jamMulai}–{s.jamSelesai}
                  </td>
                  <td>{s.mataKuliah}</td>
                  <td>{s.kelas}</td>
                  <td>{s.pengampu?.nama || <span style={{ color: "var(--danger)" }}>belum ada</span>}</td>
                  <td style={{ fontSize: 15 }}>{(s.asisten || []).map((a: any) => a.nama).join(", ") || "—"}</td>
                  {isCoord && (
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
                        Atur
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                  <option key={u.id} value={u.id}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Asisten dosen (bisa lebih dari satu)</label>
            <div className="chip-row">
              {assistants.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`chip ${asistenIds.includes(u.id) ? "is-active" : ""}`}
                  onClick={() => toggleAsisten(u.id)}
                  aria-pressed={asistenIds.includes(u.id)}
                >
                  {asistenIds.includes(u.id) && <Icon name="check" size={12} />} {u.nama}
                </button>
              ))}
              {assistants.length === 0 && <span className="field-hint">Belum ada akun dengan sub-peran asisten dosen.</span>}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button className="btn" onClick={save}>
              Simpan penugasan
            </button>
            <button className="btn btn-secondary" onClick={() => setEditSesi(null)}>
              Batal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
