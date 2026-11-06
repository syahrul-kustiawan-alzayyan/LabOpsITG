"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, withPeriode, getSelectedPeriodeId } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { labDisplayName, labRoom } from "@/lib/lab-label";

const EMPTY = { kode: "", nama: "", kapasitas: 30, lokasi: "" };

export default function LabsPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [editLab, setEditLab] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const isAdmin = me?.role === "ADMIN_SYSTEM";
  const canManageLab = ["ADMIN_SYSTEM", "COORDINATOR"].includes(me?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const per = withPeriode({});
      const labsUrl = "/labs" + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const [labList, sched, meRes] = await Promise.all([
        api<any[]>(labsUrl),
        api<any[]>("/schedules").catch(() => []),
        api<{ user: any }>("/auth/me"),
      ]);
      setLabs(labList);
      setSchedules(sched);
      setMe(meRes.user);
      if (["ADMIN_SYSTEM", "COORDINATOR"].includes(meRes.user.role)) {
        setInventory(await api<any[]>("/inventory").catch(() => []));
      }
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [getSelectedPeriodeId()]);

  useEffect(() => {
    load();
  }, [load]);

  // Muat ulang lab saat periode diganti dari sidebar
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("labops:periode-changed", handler);
    return () => window.removeEventListener("labops:periode-changed", handler);
  }, [load]);

  const stats = useMemo(() => {
    const map: Record<string, { sessions: number; assets: number; broken: number }> = {};
    for (const l of labs) map[l.id] = { sessions: 0, assets: 0, broken: 0 };
    for (const s of schedules) if (map[s.labId]) map[s.labId].sessions += 1;
    for (const it of inventory) {
      if (!map[it.labId]) continue;
      map[it.labId].assets += 1;
      if (it.kondisi === "RUSAK" || it.kondisi === "PERLU_PERAWATAN") map[it.labId].broken += 1;
    }
    return map;
  }, [labs, schedules, inventory]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/labs", { method: "POST", body: { ...form, kapasitas: Number(form.kapasitas) } });
      setMsg({ type: "success", text: `Lab ${form.kode} dibuat beserta QR statisnya.` });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editLab) return;
    try {
      await api(`/labs/${editLab.id}`, { method: "PUT", body: { ...editForm, kapasitas: Number(editForm.kapasitas) } });
      setMsg({ type: "success", text: `Data ${editLab.kode} diperbarui.` });
      setEditLab(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function regenerateQr(lab: any) {
    if (!window.confirm(`Buat ulang token QR statis untuk ${lab.kode}? QR cetak lama tidak berlaku.`)) return;
    try {
      await api(`/labs/${lab.id}/regenerate-qr`, { method: "PATCH" });
      setMsg({ type: "success", text: "Token QR lab dibuat ulang. Cetak ulang QR yang lama." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function remove(lab: any) {
    if (!window.confirm(`Nonaktifkan ${lab.kode}? Riwayat jadwal dan aset tetap tersimpan.`)) return;
    try {
      await api(`/labs/${lab.id}`, { method: "DELETE" });
      setMsg({ type: "success", text: `${lab.kode} dinonaktifkan.` });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setMsg({ type: "success", text: "Token QR disalin ke papan klip." });
    } catch {
      setMsg({ type: "danger", text: "Tidak dapat menyalin token di peramban ini." });
    }
  }

  const totalKapasitas = labs.reduce((sum, l) => sum + (l.kapasitas || 0), 0);
  const totalSesi = schedules.length;
  const totalAset = inventory.length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Lab</h1>
          <p className="page-subtitle">Kapasitas, lokasi, status, dan token QR statis setiap laboratorium.</p>
        </div>
        {canManageLab && (
          <div className="page-actions">
            <button className="btn" onClick={() => setShowForm((v) => !v)}>
              <Icon name={showForm ? "close" : "plus"} size={16} /> {showForm ? "Tutup form" : "Tambah lab"}
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
            <Icon name="lab" size={14} /> Lab aktif
          </span>
          <span className="ops-stat-value">{labs.filter((l) => l.status === "AKTIF").length}</span>
          <span className="ops-stat-note">dari {labs.length} lab terdaftar</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="users" size={14} /> Total kapasitas
          </span>
          <span className="ops-stat-value">{totalKapasitas}</span>
          <span className="ops-stat-note">kursi praktikum</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="calendar" size={14} /> Sesi terjadwal
          </span>
          <span className="ops-stat-value">{totalSesi}</span>
          <span className="ops-stat-note">semester aktif</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="inventory" size={14} /> Aset tercatat
          </span>
          <span className="ops-stat-value">{totalAset}</span>
          <span className="ops-stat-note">inventaris aktif</span>
        </div>
      </div>

      {showForm && canManageLab && (
        <div className="card reveal" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h2 className="card-title">Lab baru</h2>
              <p className="card-note">QR statis dibuat otomatis untuk absensi cadangan di ruang lab.</p>
            </div>
          </div>
          <form onSubmit={create} className="form-row">
            <div className="field">
              <label htmlFor="lab-kode">Kode</label>
              <input id="lab-kode" className="input" placeholder="C301" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="lab-nama">Nama lab</label>
              <input id="lab-nama" className="input" placeholder="Lab Pemrograman" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="lab-kapasitas">Kapasitas</label>
              <input id="lab-kapasitas" className="input" type="number" min={1} value={form.kapasitas} onChange={(e) => setForm({ ...form, kapasitas: Number(e.target.value) })} required />
            </div>
            <div className="field">
              <label htmlFor="lab-lokasi">Lokasi</label>
              <input id="lab-lokasi" className="input" placeholder="Gedung C, lantai 3" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} required />
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <button className="btn" type="submit">
                Simpan lab
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="stat-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: "40%" }} />
              <div className="skeleton" style={{ width: "70%", height: 22, marginTop: 12 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {labs.map((lab) => {
            const st = stats[lab.id] || { sessions: 0, assets: 0, broken: 0 };
            return (
              <article className="card" key={lab.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card-head" style={{ marginBottom: 0 }}>
                  <div>
                    <h2 className="card-title" style={{ fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
                      {lab.kode}
                    </h2>
                    <p className="card-note">{labDisplayName(lab.nama, lab.kode)}</p>
                  </div>
                  <span className={`badge ${lab.status === "AKTIF" ? "badge-success" : "badge-muted"}`}>{lab.status.toLowerCase()}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div className="stat-label">Lokasi</div>
                    <div style={{ fontSize: 15.5 }}>{labRoom(lab.nama, lab.lokasi)}</div>
                  </div>
                  <div>
                    <div className="stat-label">Kapasitas</div>
                    <div style={{ fontSize: 15.5, fontFamily: "var(--font-mono)" }}>{lab.kapasitas} kursi</div>
                  </div>
                  <div>
                    <div className="stat-label">Sesi terjadwal</div>
                    <div style={{ fontSize: 15.5, fontFamily: "var(--font-mono)" }}>{st.sessions}</div>
                  </div>
                  <div>
                    <div className="stat-label">Aset / bermasalah</div>
                    <div style={{ fontSize: 15.5, fontFamily: "var(--font-mono)" }}>
                      {st.assets} <span style={{ color: st.broken ? "var(--signal)" : "var(--ink-soft)" }}>/ {st.broken}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
                  <div className="stat-label" style={{ marginBottom: 4 }}>
                    Token QR statis
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13.5,
                        background: "var(--surface-2)",
                        padding: "4px 7px",
                        borderRadius: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {lab.qrToken}
                    </code>
                    <button className="btn btn-ghost btn-sm" onClick={() => copyToken(lab.qrToken)} aria-label="Salin token QR">
                      <Icon name="qr" size={14} />
                    </button>
                  </div>
                  <p className="field-hint" style={{ marginTop: 4 }}>
                    Dipakai hanya saat tidak ada QR sesi. Absensi tetap wajib peserta terdaftar.
                  </p>
                </div>

                {canManageLab && (
                  <div className="table-actions" style={{ marginTop: "auto" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditLab(lab);
                        setEditForm({ nama: lab.nama, kapasitas: lab.kapasitas, lokasi: lab.lokasi, status: lab.status });
                      }}
                    >
                      Ubah
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => regenerateQr(lab)}>
                      QR baru
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(lab)}>
                      Nonaktifkan
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editLab && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Ubah {editLab.kode}
              </h3>
              <p className="card-note">Kode lab tidak dapat diubah agar riwayat tetap konsisten.</p>
            </div>
            <button className="icon-btn" onClick={() => setEditLab(null)} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>
          <form onSubmit={saveEdit} className="form-row">
            <div className="field">
              <label htmlFor="edit-nama">Nama</label>
              <input id="edit-nama" className="input" value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="edit-kapasitas">Kapasitas</label>
              <input id="edit-kapasitas" className="input" type="number" min={1} value={editForm.kapasitas} onChange={(e) => setEditForm({ ...editForm, kapasitas: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="edit-lokasi">Lokasi</label>
              <input id="edit-lokasi" className="input" value={editForm.lokasi} onChange={(e) => setEditForm({ ...editForm, lokasi: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="edit-status">Status</label>
              <select id="edit-status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Nonaktif</option>
              </select>
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <button className="btn" type="submit">
                Simpan perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
