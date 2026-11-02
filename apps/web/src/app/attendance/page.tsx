"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const STATUS_BADGE: Record<string, string> = {
  HADIR: "badge-success",
  TERLAMBAT: "badge-warning",
  IZIN: "badge-info",
  SAKIT: "badge-info",
  TIDAK_HADIR: "badge-danger",
};

export default function AttendancePage() {
  const [me, setMe] = useState<any>(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [today, setToday] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<any>(null);
  const [enrollSesi, setEnrollSesi] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pickUser, setPickUser] = useState("");
  const [loading, setLoading] = useState(true);

  const isCoord = me && ["ADMIN_SYSTEM", "COORDINATOR"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, history] = await Promise.all([api<{ user: any }>("/auth/me"), api<any[]>("/attendance")]);
      setMe(m.user);
      setList(history);
      if (["ADMIN_SYSTEM", "COORDINATOR", "LEADER"].includes(m.user.role)) {
        api<any>("/reports/today").then(setToday).catch(() => {});
      }
      if (["ADMIN_SYSTEM", "COORDINATOR"].includes(m.user.role)) {
        api<any[]>("/users?pageSize=100").then(setUsers).catch(() => {});
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

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setResult(null);
    try {
      const data = await api<any>("/attendance/scan", { method: "POST", body: { qrToken: token.trim() } });
      setResult(data);
      setMsg({ type: "success", text: `Absensi tercatat: ${data.status.toLowerCase()}.` });
      setToken("");
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function makeToken(sesiId: string) {
    try {
      const data = await api<any>("/attendance/session-token", { method: "POST", body: { sesiId } });
      setSessionToken(data);
      setMsg({ type: "success", text: "Token QR sesi dibuat. Berlaku 15 menit." });
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function openEnrollments(sesi: any) {
    setEnrollSesi(sesi);
    try {
      const data = await api<any>(`/attendance/enrollments/${sesi.id}`);
      setEnrollments(data.enrolled || []);
      setUsers(data.users || []);
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function addEnrollment() {
    if (!pickUser || !enrollSesi) return;
    try {
      await api("/attendance/enrollments", { method: "POST", body: { sesiId: enrollSesi.id, userId: pickUser } });
      setPickUser("");
      const data = await api<any>(`/attendance/enrollments/${enrollSesi.id}`);
      setEnrollments(data.enrolled || []);
      setUsers(data.users || []);
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function removeEnrollment(id: string) {
    try {
      await api(`/attendance/enrollments/${id}`, { method: "DELETE" });
      setEnrollments((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Absensi</h1>
          <p className="page-subtitle">
            {isCoord
              ? "Buka QR per sesi, kelola peserta, dan koreksi kehadiran dengan alasan tercatat."
              : "Pindai token QR sesi praktikum yang sedang berlangsung."}
          </p>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="split-even">
        <div className="card">
          <h2 className="card-title">Scan kehadiran</h2>
          <p className="card-note" style={{ marginBottom: 12 }}>
            Masukkan token dari QR sesi yang ditampilkan koordinator. Absensi hanya berlaku bagi peserta terdaftar.
          </p>
          <form onSubmit={scan} className="form-grid">
            <div className="field">
              <label htmlFor="qr">Token QR sesi</label>
              <input
                id="qr"
                className="input"
                placeholder="mis. 8fK2pQ9xLmA"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ fontFamily: "var(--font-mono)" }}
                required
              />
            </div>
            <button className="btn" type="submit">
              <Icon name="qr" size={16} /> Catat kehadiran
            </button>
          </form>
          {result && (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              <strong>{result.session?.mataKuliah}</strong> · kelas {result.session?.kelas}
              <div style={{ marginTop: 3 }}>
                {result.session?.jamMulai}–{result.session?.jamSelesai} · status <strong>{result.status}</strong>
              </div>
            </div>
          )}
          {sessionToken && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="card-note" style={{ marginBottom: 6 }}>
                QR sesi aktif · {sessionToken.sesi?.mataKuliah} ({sessionToken.sesi?.kelas})
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: ".04em", wordBreak: "break-all" }}>
                {sessionToken.token}
              </div>
              <div className="field-hint" style={{ marginTop: 6 }}>
                Berlaku sampai {new Date(sessionToken.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.
                Tampilkan token ini di layar lab.
              </div>
            </div>
          )}
        </div>

        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Sesi hari ini</h2>
              <p className="card-note">{today ? `${today.sessionsToday} sesi · ${today.attendanceToday} absensi tercatat` : "Memuat…"}</p>
            </div>
          </div>
          <div className="popover-list" style={{ maxHeight: 360 }}>
            {!today ? (
              <div style={{ padding: 20 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 40, marginBottom: 10 }} />
                ))}
              </div>
            ) : today.sessionsToday === 0 ? (
              <div className="empty">
                <Icon name="calendar" size={22} />
                <p className="empty-title">Tidak ada sesi hari ini</p>
                <p className="empty-text">QR sesi hanya dapat dibuat saat hari pelaksanaan.</p>
              </div>
            ) : (
              today.sessions.map((s: any) => (
                <div key={s.id} className="notif" style={{ cursor: "default" }}>
                  <div className="session-item">
                    <div className="session-main">
                      <strong>{s.mataKuliah}</strong>
                      <div className="notif-meta">
                        <span>
                          {s.lab?.kode} · {s.jamMulai}–{s.jamSelesai}
                        </span>
                        <span>kelas {s.kelas}</span>
                      </div>
                    </div>
                    {isCoord && (
                      <div className="session-actions">
                        <button className="btn btn-sm" onClick={() => makeToken(s.id)}>
                          <Icon name="qr" size={13} /> QR
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEnrollments(s)}>
                          Peserta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {enrollSesi && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Peserta · {enrollSesi.mataKuliah} ({enrollSesi.kelas})
              </h3>
              <p className="card-note">{enrollments.length} mahasiswa terdaftar. Hanya mereka yang dapat absen.</p>
            </div>
            <button className="icon-btn" onClick={() => setEnrollSesi(null)} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <select className="input" style={{ maxWidth: 320 }} value={pickUser} onChange={(e) => setPickUser(e.target.value)}>
              <option value="">Pilih mahasiswa…</option>
              {users
                .filter((u) => !enrollments.some((e) => e.user?.id === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} — {u.email}
                  </option>
                ))}
            </select>
            <button className="btn" onClick={addEnrollment} disabled={!pickUser}>
              <Icon name="plus" size={15} /> Tambah peserta
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>{e.user?.nama}</td>
                    <td>{e.user?.email}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeEnrollment(e.id)}>
                        Keluarkan
                      </button>
                    </td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty" style={{ padding: 20 }}>
                        <p className="empty-text">Belum ada peserta terdaftar.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ margin: "22px 0 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 className="section-title" style={{ fontSize: 17 }}>
          Riwayat absensi
        </h2>
        <span className="badge badge-plain">{list.length} catatan</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Sesi</th>
              <th>Lab</th>
              <th>Waktu scan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="skeleton" style={{ height: 28 }} />
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <Icon name="attendance" size={24} />
                    <p className="empty-title">Belum ada absensi</p>
                    <p className="empty-text">Catatan kehadiran akan muncul setelah QR sesi dipindai.</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((a) => (
                <tr key={a.id}>
                  <td>{a.user?.nama}</td>
                  <td>
                    {a.sesi?.mataKuliah} <span style={{ opacity: 0.65 }}>({a.sesi?.kelas})</span>
                  </td>
                  <td className="num">{a.lab?.kode}</td>
                  <td className="num">
                    {new Date(a.scannedAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[a.status] || "badge-muted"}`}>{a.status.replace("_", " ").toLowerCase()}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
