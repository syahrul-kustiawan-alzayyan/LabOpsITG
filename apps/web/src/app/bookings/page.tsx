"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { downloadCsv } from "@/lib/export";

const STATUS = ["DIAJUKAN", "DISETUJUI", "DITOLAK", "DIBATALKAN", "SELESAI"];
const STATUS_LABEL: Record<string, string> = {
  DIAJUKAN: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
  SELESAI: "Selesai",
};
const STATUS_BADGE: Record<string, string> = {
  DIAJUKAN: "badge-warning",
  DISETUJUI: "badge-success",
  DITOLAK: "badge-danger",
  DIBATALKAN: "badge-muted",
  SELESAI: "badge-info",
};

const EMPTY = {
  labId: "",
  tanggal: "",
  jamMulai: "08:00",
  jamSelesai: "10:00",
  keperluan: "",
  jumlahPeserta: "",
  kebutuhanKhusus: "",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [availability, setAvailability] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [b, l, m] = await Promise.all([
        api<any[]>(`/bookings${filterStatus ? `?status=${filterStatus}` : ""}`),
        api<any[]>("/labs"),
        api<{ user: any }>("/auth/me"),
      ]);
      setBookings(b);
      setLabs(l);
      setMe(m.user);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterStatus]);

  useEffect(() => {
    if (!form.labId || !form.tanggal) {
      setAvailability(null);
      return;
    }
    let alive = true;
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const q = new URLSearchParams({
          labId: form.labId,
          tanggal: form.tanggal,
          jamMulai: form.jamMulai,
          jamSelesai: form.jamSelesai,
        });
        const res = await api<{ ok: boolean; reason?: string }>(`/bookings/availability/check?${q}`);
        if (alive) setAvailability(res);
      } catch {
        if (alive) setAvailability(null);
      } finally {
        if (alive) setChecking(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [form.labId, form.tanggal, form.jamMulai, form.jamSelesai]);

  const isCoord = me && ["COORDINATOR", "ADMIN_SYSTEM"].includes(me.role);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (availability && !availability.ok) {
      setMsg({ type: "danger", text: availability.reason || "Slot tidak tersedia." });
      return;
    }
    try {
      const body: any = { ...form };
      if (body.jumlahPeserta) body.jumlahPeserta = Number(body.jumlahPeserta);
      if (!body.jumlahPeserta) delete body.jumlahPeserta;
      if (!body.kebutuhanKhusus) delete body.kebutuhanKhusus;
      await api("/bookings", { method: "POST", body });
      setMsg({ type: "success", text: "Pengajuan terkirim. Koordinator akan meninjaunya." });
      setForm({ ...EMPTY, labId: form.labId });
      setAvailability(null);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function approve(id: string) {
    if (!window.confirm("Setujui pengajuan ini? Slot akan langsung dikunci.")) return;
    try {
      await api(`/bookings/${id}/approve`, { method: "PATCH" });
      setMsg({ type: "success", text: "Peminjaman disetujui." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function reject(id: string) {
    if (!alasan.trim()) {
      setMsg({ type: "danger", text: "Alasan penolakan wajib diisi." });
      return;
    }
    try {
      await api(`/bookings/${id}/reject`, { method: "PATCH", body: { alasan } });
      setRejectId(null);
      setAlasan("");
      setMsg({ type: "success", text: "Pengajuan ditolak dan peminjam diberi tahu." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function cancel(id: string) {
    if (!window.confirm("Batalkan peminjaman ini?")) return;
    try {
      await api(`/bookings/${id}/cancel`, { method: "PATCH" });
      setMsg({ type: "success", text: "Peminjaman dibatalkan." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function complete(id: string) {
    try {
      await api(`/bookings/${id}/complete`, { method: "PATCH" });
      setMsg({ type: "success", text: "Peminjaman ditandai selesai." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATUS) map[s] = 0;
    for (const b of bookings) map[b.status] = (map[b.status] || 0) + 1;
    return map;
  }, [bookings]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Peminjaman Lab</h1>
          <p className="page-subtitle">
            {isCoord ? "Tinjau pengajuan, cegah bentrok, dan jaga jejak keputusan." : "Ajukan pemakaian lab di luar jadwal praktikum dan pantau statusnya."}
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              downloadCsv(
                "peminjaman-lab.csv",
                bookings.map((b) => ({
                  peminjam: b.peminjam?.nama,
                  lab: b.lab?.kode,
                  tanggal: new Date(b.tanggal).toLocaleDateString("id-ID"),
                  jamMulai: b.jamMulai,
                  jamSelesai: b.jamSelesai,
                  keperluan: b.keperluan,
                  status: b.status,
                })),
              )
            }
          >
            <Icon name="report" size={16} /> Ekspor CSV
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} role="status">
          {msg.text}
        </div>
      )}

      <div className="split">
        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Ajukan peminjaman</h2>
              <p className="card-note">Slot dicek otomatis terhadap jadwal praktikum dan peminjaman disetujui.</p>
            </div>
          </div>
          <form onSubmit={create} className="form-grid" style={{ padding: "0 20px 20px" }}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="b-lab">Lab</label>
                <select id="b-lab" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
                  <option value="">Pilih lab</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.kode} — {l.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="b-tanggal">Tanggal</label>
                <input id="b-tanggal" className="input" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="b-mulai">Mulai</label>
                <input id="b-mulai" className="input" type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="b-selesai">Selesai</label>
                <input id="b-selesai" className="input" type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} required />
              </div>
            </div>

            {checking && <p className="field-hint">Memeriksa ketersediaan…</p>}
            {!checking && availability && (
              <div className={`alert ${availability.ok ? "alert-success" : "alert-danger"}`} style={{ margin: 0 }}>
                {availability.ok ? "Slot tersedia." : availability.reason}
              </div>
            )}

            <div className="field">
              <label htmlFor="b-keperluan">Keperluan</label>
              <input id="b-keperluan" className="input" value={form.keperluan} onChange={(e) => setForm({ ...form, keperluan: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="b-peserta">Jumlah peserta</label>
                <input id="b-peserta" className="input" type="number" min={1} value={form.jumlahPeserta} onChange={(e) => setForm({ ...form, jumlahPeserta: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="b-khusus">Kebutuhan khusus</label>
                <input id="b-khusus" className="input" value={form.kebutuhanKhusus} onChange={(e) => setForm({ ...form, kebutuhanKhusus: e.target.value })} />
              </div>
            </div>
            <button className="btn" type="submit" disabled={availability?.ok === false || checking}>
              <Icon name="booking" size={15} /> Kirim pengajuan
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">Ringkasan</h2>
          <p className="card-note" style={{ marginBottom: 14 }}>
            {bookings.length} pengajuan pada tampilan ini.
          </p>
          <div style={{ display: "grid", gap: 9 }}>
            {STATUS.map((s) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${STATUS_BADGE[s]}`}>{STATUS_LABEL[s]}</span>
                <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 15.5 }}>
                  {counts[s] || 0}
                </span>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <p className="field-hint" style={{ margin: 0 }}>
            Peminjaman hanya dapat disetujui bila tidak bentrok dengan jadwal praktikum pada lab, hari, dan jam yang sama.
          </p>
        </div>
      </div>

      <div className="chip-row" style={{ margin: "20px 0 12px" }}>
        <button className={`chip ${filterStatus === "" ? "is-active" : ""}`} onClick={() => setFilterStatus("")} type="button">
          Semua
        </button>
        {STATUS.map((s) => (
          <button key={s} className={`chip ${filterStatus === s ? "is-active" : ""}`} onClick={() => setFilterStatus(s)} type="button">
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Peminjam</th>
              <th>Lab</th>
              <th>Tanggal</th>
              <th>Jam</th>
              <th>Keperluan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="skeleton" style={{ height: 30 }} />
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <Icon name="booking" size={24} />
                    <p className="empty-title">Belum ada peminjaman</p>
                    <p className="empty-text">Pengajuan baru akan muncul di sini.</p>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.peminjam?.nama}</td>
                  <td className="num">{b.lab?.kode}</td>
                  <td>{new Date(b.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="num">
                    {b.jamMulai}–{b.jamSelesai}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetail(b)} style={{ paddingLeft: 0 }}>
                      {b.keperluan}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      {isCoord && b.status === "DIAJUKAN" && (
                        <>
                          <button className="btn btn-sm" onClick={() => approve(b.id)}>
                            Setujui
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectId(b.id)}>
                            Tolak
                          </button>
                        </>
                      )}
                      {isCoord && b.status === "DISETUJUI" && (
                        <button className="btn btn-secondary btn-sm" onClick={() => complete(b.id)}>
                          Selesai
                        </button>
                      )}
                      {(b.peminjam?.email === me?.email || isCoord) && ["DIAJUKAN", "DISETUJUI"].includes(b.status) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => cancel(b.id)}>
                          Batalkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="panel">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                {detail.keperluan}
              </h3>
              <p className="card-note">
                {detail.lab?.kode} · {new Date(detail.tanggal).toLocaleDateString("id-ID")} · {detail.jamMulai}–{detail.jamSelesai}
              </p>
            </div>
            <button className="icon-btn" onClick={() => setDetail(null)} aria-label="Tutup detail">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 15.5 }}>
            <div>
              <strong>Peminjam:</strong> {detail.peminjam?.nama} ({detail.peminjam?.email})
            </div>
            <div>
              <strong>Peserta:</strong> {detail.jumlahPeserta || "—"}
            </div>
            <div>
              <strong>Kebutuhan khusus:</strong> {detail.kebutuhanKhusus || "—"}
            </div>
            <div>
              <strong>Diproses oleh:</strong> {detail.pemroses?.nama || "belum diproses"}
            </div>
            {detail.alasanKeputusan && (
              <div>
                <strong>Alasan keputusan:</strong> {detail.alasanKeputusan}
              </div>
            )}
          </div>
        </div>
      )}

      {rejectId && (
        <div className="panel" style={{ borderColor: "#e5bdb8", background: "var(--danger-050)" }}>
          <h3 className="panel-title">Alasan penolakan</h3>
          <textarea className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} placeholder="Jelaskan alasan agar peminjam dapat menyesuaikan." />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => reject(rejectId)}>
              Kirim penolakan
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRejectId(null);
                setAlasan("");
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
