"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { ScheduleGrid, hourRangeFor } from "@/components/ScheduleGrid";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI_KERJA = [1, 2, 3, 4, 5];

const EMPTY_FORM = {
  labId: "",
  mataKuliahId: "",
  mataKuliah: "",
  kelas: "",
  pengampuId: "",
  hari: 1,
  jamMulai: "08:00",
  jamSelesai: "10:50",
  tanggalMulai: "2026-09-01",
  tanggalSelesai: "2027-01-31",
  semester: "2026/2027 Ganjil",
  jenis: "PRAKTIKUM_RUTIN",
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [filterLab, setFilterLab] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isInstruktur, setIsInstruktur] = useState(false);
  const [day, setDay] = useState<number>(() => {
    const now = new Date().getDay();
    return now === 0 || now === 6 ? 1 : now;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = me && ["ADMIN_SYSTEM", "COORDINATOR"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await api<{ user: any }>("/auth/me");
      setMe(meRes.user);
      if (!isInstruktur && meRes.user?.subRoles?.includes("INSTRUKTUR")) {
        setIsInstruktur(true);
        setMyOnly(true);
      }
      const params = new URLSearchParams();
      if (filterLab) params.set("labId", filterLab);
      const [sched, labList] = await Promise.all([
        myOnly ? api<any[]>("/schedules/mine") : api<any[]>(`/schedules?${params.toString()}`),
        api<any[]>("/labs"),
      ]);
      setSchedules(sched.filter((s) => (myOnly && filterLab ? s.labId === filterLab : true)));
      setLabs(labList);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [filterLab, myOnly, isInstruktur]);

  useEffect(() => {
    api<{ user: any }>("/auth/me").then((d) => setMe(d.user)).catch(() => {});
    api<any[]>("/users").then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/schedules", { method: "POST", body: { ...form, hari: Number(form.hari) } });
      setMsg({ type: "success", text: "Jadwal berhasil dibuat." });
      setForm({ ...EMPTY_FORM, labId: form.labId, semester: form.semester });
      setShowForm(false);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Batalkan dan hapus jadwal ini?")) return;
    try {
      await api(`/schedules/${id}`, { method: "DELETE" });
      setMsg({ type: "success", text: "Jadwal dihapus." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  const grouped: Record<number, any[]> = {};
  for (const s of schedules) {
    if (!grouped[s.hari]) grouped[s.hari] = [];
    grouped[s.hari].push(s);
  }

  const daySessions = grouped[day] || [];
  const dayLabCount = new Set(daySessions.map((s) => s.labId)).size;
  const dayTabs = HARI.map((_, i) => i).filter((i) => (grouped[i] || []).length > 0 || i === day);
  const hourRange = useMemo(() => hourRangeFor(schedules), [schedules]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Jadwal Lab</h1>
          <p className="page-subtitle">Peta penggunaan lab per jam, praktikum rutin, dan kegiatan khusus.</p>
        </div>
        <div className="page-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Icon name="plus" size={16} /> {showForm ? "Tutup form" : "Tambah jadwal"}
            </button>
          )}
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && canManage && (
        <div className="card reveal" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h2 className="card-title">Jadwal baru</h2>
            <span className="badge badge-plain">semester aktif</span>
          </div>
          <form onSubmit={create} className="form-row">
            <div className="field">
              <label htmlFor="s-lab">Lab</label>
              <select id="s-lab" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
                <option value="">Pilih lab</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.kode} — {l.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-mk">Mata kuliah</label>
              <input id="s-mk" className="input" value={form.mataKuliah} onChange={(e) => setForm({ ...form, mataKuliah: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-kelas">Kelas</label>
              <input id="s-kelas" className="input" value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-hari">Hari</label>
              <select id="s-hari" value={form.hari} onChange={(e) => setForm({ ...form, hari: Number(e.target.value) })}>
                {HARI.map((h, i) => (
                  <option key={i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-mulai">Jam mulai</label>
              <input id="s-mulai" className="input" type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-selesai">Jam selesai</label>
              <input id="s-selesai" className="input" type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-dari">Mulai semester</label>
              <input id="s-dari" className="input" type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-sampai">Akhir semester</label>
              <input id="s-sampai" className="input" type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-semester">Semester</label>
              <input id="s-semester" className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="s-pengampu">Pengampu</label>
              <select id="s-pengampu" value={form.pengampuId} onChange={(e) => setForm({ ...form, pengampuId: e.target.value })}>
                <option value="">Belum ditentukan</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-jenis">Jenis</label>
              <select id="s-jenis" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
                <option value="PRAKTIKUM_RUTIN">Praktikum rutin</option>
                <option value="KEGIATAN_KHUSUS">Kegiatan khusus</option>
              </select>
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" type="submit">
                Simpan jadwal
              </button>
            </div>
          </form>
          <p className="field-hint" style={{ marginTop: 10 }}>
            Sistem menolak jadwal yang bentrok pada lab, hari, jam, dan rentang tanggal yang sama.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="filter-lab">Lab</label>
            <select id="filter-lab" value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
              <option value="">Semua lab</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.kode} — {l.nama}
                </option>
              ))}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 18, fontSize: 15.5 }}>
            <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
            Jadwal saya
          </label>
          <div style={{ marginLeft: "auto", marginTop: 18 }} className="chip-row">
            <button className={`chip ${view === "grid" ? "is-active" : ""}`} onClick={() => setView("grid")} type="button">
              <Icon name="calendar" size={13} /> Peta
            </button>
            <button className={`chip ${view === "list" ? "is-active" : ""}`} onClick={() => setView("list")} type="button">
              <Icon name="report" size={13} /> Daftar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          {[0, 1, 2].map((i) => (
            <div className="skeleton" key={i} style={{ height: 40, marginBottom: 8 }} />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Icon name="calendar" size={26} />
            <p className="empty-title">Belum ada jadwal</p>
            <p className="empty-text">
              Tambahkan jadwal praktikum untuk mulai memetakan penggunaan lab.
            </p>
          </div>
        </div>
      ) : view === "grid" ? (
        <>
          <div className="day-tabs" role="tablist" aria-label="Pilih hari">
            {dayTabs.map((i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={day === i}
                className={`day-tab ${day === i ? "is-active" : ""}`}
                onClick={() => setDay(i)}
              >
                <span className="day-tab-name">{HARI[i]}</span>
                <span className="day-tab-count">{grouped[i]?.length || 0}</span>
              </button>
            ))}
          </div>

          <div className="card card-flush schedule-board">
            <div className="schedule-board-head">
              <div>
                <h2 className="schedule-board-title">{HARI[day]}</h2>
                <p className="schedule-board-note">
                  {daySessions.length} sesi · {dayLabCount} lab terpakai
                </p>
              </div>
              <span className="schedule-board-range">
                {String(hourRange.start).padStart(2, "0")}:00–
                {String(hourRange.end).padStart(2, "0")}:00
              </span>
            </div>
            <ScheduleGrid
              schedules={daySessions}
              labs={labs}
              hourRange={hourRange}
              emptyLabel={`Tidak ada sesi pada hari ${HARI[day]}`}
            />
          </div>
        </>
      ) : (
        <>
          {HARI.map((h, i) => {
            const items = grouped[i] || [];
            if (items.length === 0) return null;
            return (
              <div key={i} className="card card-flush" style={{ marginBottom: 14 }}>
                <div className="card-head">
                  <h2 className="card-title">{h}</h2>
                  <span className="badge badge-plain">{items.length} sesi</span>
                </div>
                <div className="table-wrap" style={{ border: "none", borderRadius: 0, marginTop: 8 }}>
                  <table className="table schedule-table">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Lab</th>
                        <th>Mata kuliah</th>
                        <th style={{ width: 80 }}>Kelas</th>
                        <th style={{ width: 120 }}>Jam</th>
                        <th>Pengampu</th>
                        <th style={{ width: 100 }}>Jenis</th>
                        <th style={{ width: 110 }}>{canManage ? "Aksi" : ""}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr key={s.id} className="schedule-row">
                          <td className="num">
                            <span className="schedule-lab-chip">{s.lab?.kode}</span>
                          </td>
                          <td>
                            <div className="schedule-course">{s.mataKuliah}</div>
                            <div className="schedule-meta">
                              {s.kelas ? <span className="schedule-meta-item">Kelas {s.kelas}</span> : null}
                              {s.semester ? <span className="schedule-meta-item">{s.semester}</span> : null}
                            </div>
                          </td>
                          <td className="num">
                            <span className="schedule-time-chip">{s.jamMulai}–{s.jamSelesai}</span>
                          </td>
                          <td>
                            {s.pengampu?.nama || (
                              <span className="schedule-meta-none">—</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${s.jenis === "PRAKTIKUM_RUTIN" ? "badge-success" : "badge-info"}`}
                            >
                              {s.jenis === "PRAKTIKUM_RUTIN" ? "Praktikum" : "Kegiatan"}
                            </span>
                          </td>
                          <td>
                            {canManage && (
                              <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
