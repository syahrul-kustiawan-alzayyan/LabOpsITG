"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";

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
  LAINNYA: "Lainnya",
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

function formatTime(id: string | null) {
  if (!id) return "-";
  return new Date(id).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function ValidateAttendancePage() {
  const [qrToken, setQrToken] = useState("");
  const [me, setMe] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const m = await api<{ user: any }>("/auth/me");
      setMe(m.user);
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // Jika datang dari scan QR (parameter ?token=), isi input otomatis
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token && !qrToken) {
      setQrToken(token);
      // Bersihkan parameter di URL agar tidak terlihat di address bar
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [qrToken]);

  async function scan() {
    setMsg(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await api<any>("/attendance/validate", {
        method: "POST",
        body: { qrToken: qrToken.trim() },
      });
      setResult(data);
      setMsg({ type: "success", text: "QR code valid. Berikut detail sesi dan kehadiran tim pengajar." });
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!result) return;
    setConfirming(true);
    setMsg(null);
    try {
      await api("/attendance/validate/confirm", {
        method: "POST",
        body: { qrToken },
      });
      setMsg({ type: "success", text: "Validasi berhasil disimpan. Kehadiran tim telah diverifikasi." });
      setResult((prev) => ({ ...prev, confirmed: true }));
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setConfirming(false);
    }
  }

  const members = result?.members ?? [];
  const totalHadir = result?.totalHadir ?? 0;
  const totalMembers = result?.totalMembers ?? 0;

  return (
    <div className="validate-attendance">
      <div className="page-header">
        <div>
          <h1 className="page-title">Validasi Absensi QR</h1>
          <p className="page-subtitle">
            KM kelas memindai QR code yang ditampilkan instruktur untuk memvalidasi kehadiran tim pengajar.
          </p>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {!result ? (
        <div className="split-even">
          <div className="card">
            <h2 className="card-title">Scan QR Code</h2>
            <p className="card-note" style={{ marginBottom: 14 }}>
              Masukkan token QR yang ditampilkan pada layar lab instruktur.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); scan(); }} className="form-grid">
              <div className="field">
                <label htmlFor="validate-qr">Token QR</label>
                <input
                  id="validate-qr"
                  className="input"
                  placeholder="mis. sJMhspSzt-X7…"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  style={{ fontFamily: "var(--font-mono)" }}
                  required
                />
                <span className="field-hint">Isi token yang muncul saat memindai gambar QR instruktur dengan kamera ponsel.</span>
              </div>
              <button className="btn" type="submit" disabled={loading || !qrToken.trim()}>
                {loading ? "Memindai…" : <><Icon name="qr" size={15} /> Verifikasi QR</>}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">Petunjuk</h2>
            <ol className="guide-list">
              <li>Instruktur menampilkan gambar QR code pada layar lab setelah memilih mata kuliah dan kelas.</li>
              <li>KM kelas memindai gambar QR dengan kamera ponsel; halaman validasi akan terbuka langsung dengan token terisi.</li>
              <li>Periksa daftar anggota tim dan status kehadirannya.</li>
              <li>Klik <strong>Konfirmasi Validasi</strong> untuk menyimpan verifikasi.</li>
            </ol>
            <div style={{ marginTop: 16, padding: 12, background: "var(--petrol-050)", borderRadius: 8, border: "1px dashed var(--petrol)" }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--petrol)" }}>
                <strong>Catatan:</strong> Validasi hanya mencatat bahwa QR code telah dipindai oleh KM kelas.
                Status kehadiran (Hadir/Tidak hadir) ditentukan oleh instruktur saat membuat sesi.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-head">
              <h2 className="card-title">Hasil Verifikasi QR</h2>
              <span className={`badge ${result.confirmed ? "badge-success" : "badge-info"}`}>
                {result.confirmed ? "Terverifikasi" : "Belum diverifikasi"}
              </span>
            </div>
            <div className="validate-detail">
              <div className="validate-field">
                <span className="validate-label">Mata kuliah</span>
                <span className="validate-value">{result.sesi.mataKuliah}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Kode</span>
                <span className="validate-value">{result.sesi.kode ?? "—"}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Kelas</span>
                <span className="validate-value">{result.sesi.kelas}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Jam</span>
                <span className="validate-value">{result.sesi.jamMulai} – {result.sesi.jamSelesai}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Lab</span>
                <span className="validate-value">{result.sesi.lab.kode}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Dipindai pada</span>
                <span className="validate-value">{formatTime(result.scannedAt)}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Dipindai oleh</span>
                <span className="validate-value">{me?.nama || result.scannedBy}</span>
              </div>
              <div className="validate-field">
                <span className="validate-label">Token QR</span>
                <span className="validate-value mono">{result.tokenId}</span>
              </div>
            </div>
            <div className="validate-summary" style={{ marginTop: 14 }}>
              <span className="badge badge-plain">{totalMembers} anggota tim</span>
              <span className={`badge ${totalHadir === totalMembers && totalMembers > 0 ? "badge-success" : "badge-muted"}`}>
                {totalHadir} hadir
              </span>
              <span className="badge badge-plain">{totalMembers - totalHadir} tidak hadir</span>
            </div>
          </div>

          <div className="card card-flush">
            <h2 className="card-title">Daftar Anggota Tim Pengajar</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Peran</th>
                    <th>Status</th>
                    <th>Terverifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty" style={{ padding: 20 }}>
                          <p className="empty-text">Belum ada data kehadiran anggota tim.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    members.map((m: any) => (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="team-avatar" style={{ width: 28, height: 28, fontSize: 11 }} aria-hidden="true">
                              {initials(m.nama)}
                            </span>
                            {m.nama}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-muted">{PERAN_LABEL[m.peran] || m.peran}</span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[m.status] || "badge-muted"}`}>
                            {m.status.replace("_", " ").toLowerCase()}
                          </span>
                        </td>
                        <td>
                          {m.validatedBy ? (
                            <span className="badge badge-success" title={`Divalidasi pada ${formatTime(m.validatedAt)}`}>
                              ✓
                            </span>
                          ) : (
                            <span className="badge badge-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!result.confirmed && (
            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-full"
                onClick={confirm}
                disabled={confirming}
              >
                {confirming ? "Menyimpan validasi…" : <><Icon name="check" size={15} /> Konfirmasi Validasi</>}
              </button>
            </div>
          )}
          {result.confirmed && (
            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setResult(null);
                  setQrToken("");
                  setMsg(null);
                }}
              >
                <Icon name="refresh" size={14} /> Validasi QR lain
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
