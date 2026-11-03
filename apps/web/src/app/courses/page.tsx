"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { labDisplayName } from "@/lib/lab-label";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type KelasForm = {
  nama: string;
  labId: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  semester: string;
};

type Team = { dosenId: string; instrukturId: string; asistenIds: string[] };

function currentTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) return `${year}/${year + 1} Ganjil`;
  if (month >= 2) return `${year - 1}/${year} Genap`;
  return `${year - 1}/${year} Ganjil`;
}

function termRange(term: string) {
  const year = Number(term.slice(0, 4)) || new Date().getFullYear();
  if (/genap/i.test(term)) return { mulai: `${year}-02-01`, selesai: `${year}-06-30` };
  return { mulai: `${year}-09-01`, selesai: `${year + 1}-01-31` };
}

function emptyKelas(nama = "A"): KelasForm {
  const term = currentTerm();
  const range = termRange(term);
  return {
    nama,
    labId: "",
    hari: 1,
    jamMulai: "08:00",
    jamSelesai: "10:50",
    tanggalMulai: range.mulai,
    tanggalSelesai: range.selesai,
    semester: term,
  };
}

const EMPTY_FORM = {
  kode: "",
  nama: "",
  sks: 3,
  semester: 1,
  deskripsi: "",
  dosenId: "",
  instrukturId: "",
  asistenIds: [] as string[],
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [formKelas, setFormKelas] = useState<KelasForm[]>([emptyKelas()]);

  const [editCourse, setEditCourse] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(EMPTY_FORM);
  const [editStatus, setEditStatus] = useState("AKTIF");

  const [kelasEditor, setKelasEditor] = useState<
    null | { mode: "create"; course: any } | { mode: "edit"; course: any; scheduleId: string; form: KelasForm }
  >(null);
  const [kelasForm, setKelasForm] = useState<KelasForm>(emptyKelas());
  const [saving, setSaving] = useState(false);

  const canManage = me && ["ADMIN_SYSTEM", "COORDINATOR"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await api<{ user: any }>("/auth/me");
      setMe(meRes.user);
      const [courseList, labList] = await Promise.all([api<any[]>("/courses"), api<any[]>("/labs")]);
      setCourses(courseList);
      setLabs(labList);
      if (["ADMIN_SYSTEM", "COORDINATOR"].includes(meRes.user.role)) {
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.kode?.toLowerCase().includes(q) ||
        c.nama?.toLowerCase().includes(q) ||
        c.dosen?.nama?.toLowerCase().includes(q) ||
        c.instruktur?.nama?.toLowerCase().includes(q) ||
        (c.asisten || []).some((a: any) => a.nama?.toLowerCase().includes(q)) ||
        (c.kelas || []).some((k: any) => `${k.kelas} ${k.lab?.kode || ""}`.toLowerCase().includes(q))
      );
    });
  }, [courses, search, statusFilter]);

  const stats = useMemo(() => {
    const totalKelas = courses.reduce((sum, c) => sum + (c.kelas?.length || 0), 0);
    const lengkap = courses.filter(
      (c) => c.dosen && c.instruktur && (c.asisten?.length || 0) > 0 && (c.kelas?.length || 0) > 0,
    ).length;
    const labIds = new Set<string>();
    for (const c of courses) for (const k of c.kelas || []) if (k.labId) labIds.add(k.labId);
    return { totalKelas, lengkap, labTerpakai: labIds.size };
  }, [courses]);

  function teamFrom(source: any): Team {
    return {
      dosenId: source.dosenId || "",
      instrukturId: source.instrukturId || "",
      asistenIds: source.asistenIds || [],
    };
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api("/courses", {
        method: "POST",
        body: { ...form, sks: Number(form.sks), semester: Number(form.semester), kelas: formKelas },
      });
      setMsg({ type: "success", text: `Mata kuliah ${form.nama} beserta ${formKelas.length} kelas dibuat.` });
      setForm(EMPTY_FORM);
      setFormKelas([emptyKelas()]);
      setShowForm(false);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(course: any) {
    setEditCourse(course);
    setEditForm({
      ...teamFrom(course),
      kode: course.kode,
      nama: course.nama,
      sks: course.sks,
      semester: course.semester,
      deskripsi: course.deskripsi || "",
    });
    setEditStatus(course.status);
    setShowForm(false);
    setKelasEditor(null);
    setMsg(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCourse) return;
    setSaving(true);
    setMsg(null);
    try {
      await api(`/courses/${editCourse.id}`, {
        method: "PUT",
        body: {
          ...editForm,
          sks: Number(editForm.sks),
          semester: Number(editForm.semester),
          status: editStatus,
        },
      });
      setMsg({ type: "success", text: `Mata kuliah ${editForm.nama} diperbarui.` });
      setEditCourse(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(course: any) {
    const next = course.status === "AKTIF" ? "NONAKTIF" : "AKTIF";
    if (!window.confirm(`${next === "AKTIF" ? "Aktifkan" : "Nonaktifkan"} ${course.nama}?`)) return;
    try {
      await api(`/courses/${course.id}`, { method: "PUT", body: { status: next } });
      setMsg({
        type: "success",
        text: `${course.nama} ${next === "AKTIF" ? "diaktifkan" : "dinonaktifkan"}.`,
      });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function remove(course: any) {
    if (!window.confirm(`Hapus ${course.nama}? Seluruh kelas dan jadwalnya ikut dibatalkan.`)) return;
    try {
      await api(`/courses/${course.id}`, { method: "DELETE" });
      setMsg({ type: "success", text: `${course.nama} dihapus.` });
      setEditCourse(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  function openCreateKelas(course: any) {
    const nextName = String.fromCharCode(65 + Math.min(25, course.kelas?.length || 0));
    const row = emptyKelas(nextName);
    setKelasForm(row);
    setKelasEditor({ mode: "create", course });
    setEditCourse(null);
    setMsg(null);
  }

  function openEditKelas(course: any, kelas: any) {
    setKelasForm({
      nama: kelas.kelas,
      labId: kelas.labId,
      hari: kelas.hari,
      jamMulai: kelas.jamMulai,
      jamSelesai: kelas.jamSelesai,
      tanggalMulai: String(kelas.tanggalMulai).slice(0, 10),
      tanggalSelesai: String(kelas.tanggalSelesai).slice(0, 10),
      semester: kelas.semester,
    });
    setKelasEditor({ mode: "edit", course, scheduleId: kelas.id, form: kelasForm });
    setEditCourse(null);
    setMsg(null);
  }

  async function saveKelas(e: React.FormEvent) {
    e.preventDefault();
    if (!kelasEditor) return;
    setSaving(true);
    setMsg(null);
    try {
      if (kelasEditor.mode === "create") {
        await api(`/courses/${kelasEditor.course.id}/kelas`, { method: "POST", body: kelasForm });
        setMsg({ type: "success", text: `Kelas ${kelasForm.nama} ditambahkan.` });
      } else {
        await api(`/courses/${kelasEditor.course.id}/kelas/${kelasEditor.scheduleId}`, {
          method: "PUT",
          body: kelasForm,
        });
        setMsg({ type: "success", text: `Kelas ${kelasForm.nama} diperbarui.` });
      }
      setKelasEditor(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function removeKelas(course: any, kelas: any) {
    if (!window.confirm(`Hapus kelas ${kelas.kelas} dari ${course.nama}?`)) return;
    try {
      await api(`/courses/${course.id}/kelas/${kelas.id}`, { method: "DELETE" });
      setMsg({ type: "success", text: `Kelas ${kelas.kelas} dihapus.` });
      if (kelasEditor?.mode === "edit" && kelasEditor.scheduleId === kelas.id) setKelasEditor(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  function addKelasRow() {
    const nextName = String.fromCharCode(65 + Math.min(25, formKelas.length));
    setFormKelas((rows) => [...rows, emptyKelas(nextName)]);
  }

  function updateKelasRow(index: number, patch: Partial<KelasForm>) {
    setFormKelas((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mata Kuliah</h1>
          <p className="page-subtitle">
            Data mata kuliah praktikum beserta dosen pengampu, instruktur, asisten dosen, dan kelas jadwalnya.
          </p>
        </div>
        {canManage && (
          <div className="page-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm((v) => !v);
                setEditCourse(null);
                setKelasEditor(null);
              }}
            >
              <Icon name={showForm ? "close" : "plus"} size={16} /> {showForm ? "Tutup form" : "Tambah mata kuliah"}
            </button>
          </div>
        )}
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
          <span className="ops-stat-note">praktikum terdaftar</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="calendar" size={14} /> Kelas terjadwal
          </span>
          <span className="ops-stat-value">{stats.totalKelas}</span>
          <span className="ops-stat-note">sesi praktikum rutin</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="staff" size={14} /> Tim lengkap
          </span>
          <span className="ops-stat-value">{stats.lengkap}</span>
          <span className="ops-stat-note">dosen, instruktur, asisten</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="lab" size={14} /> Lab terpakai
          </span>
          <span className="ops-stat-value">{stats.labTerpakai}</span>
          <span className="ops-stat-note">ruang praktikum</span>
        </div>
      </div>

      {showForm && canManage && (
        <div className="card reveal" style={{ marginTop: 16 }}>
          <div className="card-head">
            <div>
              <h2 className="card-title">Mata kuliah praktikum baru</h2>
              <p className="card-note">
                Isi data mata kuliah, tentukan tim pengajar, lalu tambahkan kelas beserta jadwalnya.
              </p>
            </div>
          </div>

          <form onSubmit={create}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="mk-kode">Kode</label>
                <input
                  id="mk-kode"
                  className="input"
                  placeholder="IF2101"
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="mk-nama">Nama mata kuliah</label>
                <input
                  id="mk-nama"
                  className="input"
                  placeholder="Praktikum Basis Data"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="mk-sks">SKS</label>
                <input
                  id="mk-sks"
                  className="input"
                  type="number"
                  min={1}
                  max={12}
                  value={form.sks}
                  onChange={(e) => setForm({ ...form, sks: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="mk-semester">Semester kurikulum</label>
                <input
                  id="mk-semester"
                  className="input"
                  type="number"
                  min={1}
                  max={14}
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="mk-deskripsi">Deskripsi singkat</label>
              <input
                id="mk-deskripsi"
                className="input"
                placeholder="Topik praktikum dan catatan pelaksanaan"
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              />
            </div>

            <TeamFields
              team={teamFrom(form)}
              users={users}
              onChange={(patch) => setForm({ ...form, ...patch })}
              onUsersChange={(next) => setUsers(next)}
            />

            <div className="section-head" style={{ marginTop: 22 }}>
              <div>
                <h3 className="panel-title" style={{ margin: 0 }}>
                  Kelas &amp; jadwal praktikum
                </h3>
                <p className="card-note">Satu kelas berisi satu sesi praktikum rutin pada lab dan jam tertentu.</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addKelasRow}>
                <Icon name="plus" size={14} /> Tambah kelas
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {formKelas.map((row, index) => (
                <div className="kelas-form-box" key={index}>
                  <div className="kelas-form-head">
                    <span className="badge badge-plain">Kelas {index + 1}</span>
                    {formKelas.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setFormKelas((rows) => rows.filter((_, i) => i !== index))}
                      >
                        Hapus baris
                      </button>
                    )}
                  </div>
                  <KelasFields
                    value={row}
                    labs={labs}
                    idPrefix={`new-${index}`}
                    onChange={(patch) => updateKelasRow(index, patch)}
                  />
                </div>
              ))}
            </div>

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan mata kuliah"}
              </button>
              <p className="field-hint">
                Sistem menolak kelas yang bentrok dengan jadwal praktikum atau peminjaman lain pada lab dan jam yang sama.
              </p>
            </div>
          </form>
        </div>
      )}

      {editCourse && canManage && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Ubah {editCourse.nama}
              </h3>
              <p className="card-note">Tim pengajar yang diubah berlaku untuk seluruh kelas mata kuliah ini.</p>
            </div>
            <button className="icon-btn" onClick={() => setEditCourse(null)} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>

          <form onSubmit={saveEdit}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="edit-kode">Kode</label>
                <input
                  id="edit-kode"
                  className="input"
                  value={editForm.kode}
                  onChange={(e) => setEditForm({ ...editForm, kode: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="edit-nama">Nama mata kuliah</label>
                <input
                  id="edit-nama"
                  className="input"
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="edit-sks">SKS</label>
                <input
                  id="edit-sks"
                  className="input"
                  type="number"
                  min={1}
                  max={12}
                  value={editForm.sks}
                  onChange={(e) => setEditForm({ ...editForm, sks: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="edit-semester">Semester kurikulum</label>
                <input
                  id="edit-semester"
                  className="input"
                  type="number"
                  min={1}
                  max={14}
                  value={editForm.semester}
                  onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="edit-status">Status</label>
                <select id="edit-status" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="AKTIF">Aktif</option>
                  <option value="NONAKTIF">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="edit-deskripsi">Deskripsi singkat</label>
              <input
                id="edit-deskripsi"
                className="input"
                value={editForm.deskripsi}
                onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })}
              />
            </div>

            <TeamFields
              team={teamFrom(editForm)}
              users={users}
              onChange={(patch) => setEditForm({ ...editForm, ...patch })}
              onUsersChange={(next) => setUsers(next)}
            />

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(editCourse)}>
                Hapus mata kuliah
              </button>
            </div>
          </form>
        </div>
      )}

      {kelasEditor && canManage && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                {kelasEditor.mode === "create" ? "Tambah kelas" : "Ubah kelas"} — {kelasEditor.course.nama}
              </h3>
              <p className="card-note">
                Kelas otomatis memakai dosen dan asisten dari mata kuliah. Perubahan jadwal dicek bentroknya.
              </p>
            </div>
            <button className="icon-btn" onClick={() => setKelasEditor(null)} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>

          <form onSubmit={saveKelas}>
            <KelasFields value={kelasForm} labs={labs} idPrefix="kelas-edit" onChange={(patch) => setKelasForm({ ...kelasForm, ...patch })} />
            <div className="form-actions" style={{ marginTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan kelas"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setKelasEditor(null)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 260px", maxWidth: 420 }}>
            <label htmlFor="filter-cari">Cari</label>
            <input
              id="filter-cari"
              className="input"
              placeholder="Kode, nama, dosen, atau kelas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: "0 0 180px" }}>
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua status</option>
              <option value="AKTIF">Aktif</option>
              <option value="NONAKTIF">Nonaktif</option>
            </select>
          </div>
          <span className="badge badge-muted" style={{ marginLeft: "auto", marginBottom: 10 }}>
            {visible.length} dari {courses.length} mata kuliah
          </span>
        </div>
      </div>

      {loading ? (
        <div className="course-grid" style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div className="card" key={i}>
              <div className="skeleton" style={{ width: "35%" }} />
              <div className="skeleton" style={{ width: "70%", height: 22, marginTop: 12 }} />
              <div className="skeleton" style={{ height: 76, marginTop: 16 }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="empty">
            <Icon name="book" size={26} />
            <p className="empty-title">Belum ada mata kuliah yang cocok</p>
            <p className="empty-text">
              {courses.length === 0
                ? "Tambahkan mata kuliah praktikum beserta dosen, instruktur, asisten, dan kelas jadwalnya."
                : "Ubah kata kunci atau filter status untuk melihat mata kuliah lain."}
            </p>
          </div>
        </div>
      ) : (
        <div className="course-grid" style={{ marginTop: 16 }}>
          {visible.map((course) => {
            const asisten = (course.asisten || []).map((a: any) => a.nama).join(", ");
            return (
              <article
                className={`card course-card ${course.status === "NONAKTIF" ? "status-nonaktif" : ""}`}
                key={course.id}
              >
                <div className="course-card-header">
                  <div>
                    <span className="course-kode-chip">{course.kode}</span>
                    <h2 className="course-name">{course.nama}</h2>
                    <p className="course-meta">
                      <span>{course.sks} SKS</span>
                      <span>Semester {course.semester}</span>
                    </p>
                  </div>
                  <span
                    className={`badge ${course.status === "AKTIF" ? "badge-success" : "badge-muted"}`}
                  >
                    {course.status === "AKTIF" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div className="course-card-body">
                  {course.deskripsi && <p className="course-desc">{course.deskripsi}</p>}

                  <div className="course-team">
                    <div className="team-line">
                      <span>Dosen</span>
                      {course.dosen ? (
                        <>
                          <span className="team-avatar">{initials(course.dosen.nama)}</span>
                          <strong>{course.dosen.nama}</strong>
                        </>
                      ) : (
                        <span className="team-empty">Belum ditentukan</span>
                      )}
                    </div>
                    <div className="team-line">
                      <span>Instruktur</span>
                      {course.instruktur ? (
                        <>
                          <span className="team-avatar instruktur">{initials(course.instruktur.nama)}</span>
                          <strong>{course.instruktur.nama}</strong>
                        </>
                      ) : (
                        <span className="team-empty">Belum ditentukan</span>
                      )}
                    </div>
                    <div className="team-line">
                      <span>Asisten</span>
                      {asisten ? (
                        <>
                          {course.asisten?.slice(0, 2).map((a: any) => (
                            <span key={a.id} className="team-avatar asisten">
                              {initials(a.nama)}
                            </span>
                          ))}
                          <strong>{asisten}</strong>
                        </>
                      ) : (
                        <span className="team-empty">Belum ditentukan</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="kelas-head">
                      <span className="stat-label">Kelas &amp; jadwal</span>
                      <span className="badge badge-plain">{course.kelas?.length || 0} kelas</span>
                    </div>
                    {course.kelas?.length ? (
                      <div className="kelas-list">
                        {course.kelas.map((kelas: any) => (
                          <div className="kelas-row" key={kelas.id}>
                            <span className="kelas-tag">Kelas {kelas.kelas}</span>
                            <span className="kelas-info">
                              <span>
                                {HARI[kelas.hari]} · {kelas.jamMulai}–{kelas.jamSelesai}
                              </span>
                              <span className="kelas-sub">
                                {kelas.lab?.kode || "Lab"} · {kelas.semester}
                              </span>
                            </span>
                            {canManage && (
                              <span className="kelas-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => openEditKelas(course, kelas)}
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => removeKelas(course, kelas)}
                                >
                                  Hapus
                                </button>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="field-hint">Belum ada kelas. Tambahkan kelas beserta jadwalnya.</p>
                    )}
                  </div>

                  {canManage && (
                    <div className="course-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openCreateKelas(course)}
                      >
                        <Icon name="plus" size={14} /> Kelas
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(course)}>
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleStatus(course)}
                      >
                        {course.status === "AKTIF" ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------- subkomponen */

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function TeamFields({
  team,
  users,
  onChange,
  onUsersChange,
}: {
  team: Team;
  users: any[];
  onChange: (patch: Partial<Team>) => void;
  onUsersChange: (next: any[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipe, setTipe] = useState("DOSEN");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const dosen = users.filter(
    (u) => u.subRoles?.includes("DOSEN") || ["COORDINATOR", "ADMIN_SYSTEM"].includes(u.role),
  );
  const instruktur = users.filter((u) => u.subRoles?.includes("INSTRUKTUR"));
  const asisten = users.filter((u) => u.subRoles?.includes("ASISTEN_DOSEN"));

  function toggleAsisten(id: string) {
    onChange({
      asistenIds: team.asistenIds.includes(id)
        ? team.asistenIds.filter((x) => x !== id)
        : [...team.asistenIds, id],
    });
  }

  async function addPersonel(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const user = await api<any>("/courses/personel", {
        method: "POST",
        body: { nama, email, tipe },
      });
      onUsersChange([user, ...users]);
      if (tipe === "DOSEN") onChange({ dosenId: user.id });
      else if (tipe === "INSTRUKTUR") onChange({ instrukturId: user.id });
      else onChange({ asistenIds: [...team.asistenIds, user.id] });
      setNama("");
      setEmail("");
      setNote(`${user.nama} ditambahkan dengan kata sandi awal Labops123.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="team-fields">
      <div className="form-row" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor="mk-dosen">Dosen pengampu</label>
          <select id="mk-dosen" value={team.dosenId} onChange={(e) => onChange({ dosenId: e.target.value })}>
            <option value="">Belum ditentukan</option>
            {dosen.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mk-instruktur">Instruktur</label>
          <select
            id="mk-instruktur"
            value={team.instrukturId}
            onChange={(e) => onChange({ instrukturId: e.target.value })}
          >
            <option value="">Belum ditentukan</option>
            {instruktur.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
          {instruktur.length === 0 && <span className="field-hint">Belum ada instruktur terdaftar.</span>}
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Asisten dosen</label>
        {asisten.length === 0 ? (
          <span className="field-hint">Belum ada asisten dosen terdaftar.</span>
        ) : (
          <div className="chip-row">
            {asisten.map((u) => (
              <button
                type="button"
                key={u.id}
                className={`chip ${team.asistenIds.includes(u.id) ? "is-active" : ""}`}
                onClick={() => toggleAsisten(u.id)}
                aria-pressed={team.asistenIds.includes(u.id)}
              >
                {u.nama}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="personel-box">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? "close" : "plus"} size={14} /> {open ? "Tutup personel baru" : "Tambah personel baru"}
        </button>
        {open && (
          <form className="personel-form" onSubmit={addPersonel}>
            <div className="field">
              <label htmlFor="personel-tipe">Tipe</label>
              <select id="personel-tipe" value={tipe} onChange={(e) => setTipe(e.target.value)}>
                <option value="DOSEN">Dosen</option>
                <option value="INSTRUKTUR">Instruktur</option>
                <option value="ASISTEN_DOSEN">Asisten dosen</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="personel-nama">Nama</label>
              <input
                id="personel-nama"
                className="input"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="personel-email">Email</label>
              <input
                id="personel-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Menyimpan..." : "Simpan personel"}
              </button>
            </div>
          </form>
        )}
        <p className="field-hint">
          Personel baru dibuat sebagai akun pengguna dengan sub-peran sesuai tipe dan kata sandi awal Labops123.
        </p>
        {note && <p className="field-hint">{note}</p>}
        {error && <p className="field-error">{error}</p>}
      </div>
    </div>
  );
}

function KelasFields({
  value,
  onChange,
  labs,
  idPrefix,
}: {
  value: KelasForm;
  onChange: (patch: Partial<KelasForm>) => void;
  labs: any[];
  idPrefix: string;
}) {
  return (
    <div className="form-row">
      <div className="field">
        <label htmlFor={`${idPrefix}-nama`}>Kelas</label>
        <input
          id={`${idPrefix}-nama`}
          className="input"
          placeholder="A"
          value={value.nama}
          onChange={(e) => onChange({ nama: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-lab`}>Lab</label>
        <select
          id={`${idPrefix}-lab`}
          value={value.labId}
          onChange={(e) => onChange({ labId: e.target.value })}
          required
        >
          <option value="">Pilih lab</option>
          {labs.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.kode} — {labDisplayName(lab.nama, lab.kode)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-hari`}>Hari</label>
        <select id={`${idPrefix}-hari`} value={value.hari} onChange={(e) => onChange({ hari: Number(e.target.value) })}>
          {HARI.map((hari, index) => (
            <option key={hari} value={index}>
              {hari}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-mulai`}>Jam mulai</label>
        <input
          id={`${idPrefix}-mulai`}
          className="input"
          type="time"
          value={value.jamMulai}
          onChange={(e) => onChange({ jamMulai: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-selesai`}>Jam selesai</label>
        <input
          id={`${idPrefix}-selesai`}
          className="input"
          type="time"
          value={value.jamSelesai}
          onChange={(e) => onChange({ jamSelesai: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-dari`}>Tanggal mulai</label>
        <input
          id={`${idPrefix}-dari`}
          className="input"
          type="date"
          value={value.tanggalMulai}
          onChange={(e) => onChange({ tanggalMulai: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-sampai`}>Tanggal selesai</label>
        <input
          id={`${idPrefix}-sampai`}
          className="input"
          type="date"
          value={value.tanggalSelesai}
          onChange={(e) => onChange({ tanggalSelesai: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-semester`}>Semester akademik</label>
        <input
          id={`${idPrefix}-semester`}
          className="input"
          placeholder="2026/2027 Ganjil"
          value={value.semester}
          onChange={(e) => onChange({ semester: e.target.value })}
          required
        />
      </div>
    </div>
  );
}
