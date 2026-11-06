"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API_BASE } from "@/lib/api";
import { Icon } from "@/components/Icon";

const INSTRUKTUR_ACCOUNTS = [
  { username: "instruktur01", password: "aditya123", nama: "Aditya Pratama" },
  { username: "instruktur02", password: "rani123", nama: "Rani Puspitasari" },
  { username: "instruktur03", password: "bayu123", nama: "Bayu Nugroho" },
  { username: "instruktur04", password: "siti123", nama: "Siti Fadhilah" },
  { username: "instruktur05", password: "dimas123", nama: "Dimas Ramadhan" },
  { username: "instruktur06", password: "nadia123", nama: "Nadia Rahmawati" },
  { username: "instruktur07", password: "fajar123", nama: "Fajar Setiawan" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("next");
    if (target && target.startsWith("/")) setNext(target);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/auth/login", { method: "POST", body: { email, password } });
      let fallback = "/dashboard";
      try {
        const me = await api<{ user: any }>("/auth/me");
        if (me?.user?.role === "COORDINATOR") fallback = "/koordinator";
        else if (me?.user?.role === "KAPRODI") fallback = "/kaprodi";
        else if (["INSTRUKTUR", "ASISTEN_DOSEN"].includes(me?.user?.role)) fallback = "/instruktur";
      } catch {
        /* tetap arahkan ke dasbor umum bila sesi belum terbaca */
      }
      router.push(next && next.startsWith("/") ? next : fallback);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Tidak dapat masuk. Periksa email dan kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  function fillCredential(identifier: string, pass: string) {
    setEmail(identifier);
    setPassword(pass);
    setError("");
  }

  function fill(role: "admin" | "koordinator" | "kaprodi-tif" | "kaprodi-sis") {
    const map = {
      admin: ["admin@labops.local", "admin123"],
      koordinator: ["koordinator@labops.local", "koord123"],
      "kaprodi-tif": ["kaprodi-tif@labops.local", "kaprodi123"],
      "kaprodi-sis": ["kaprodi-sis@labops.local", "kaprodi123"],
    } as const;
    fillCredential(map[role][0], map[role][1]);
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="brand-inline" style={{ color: "#fff", marginBottom: 40 }}>
            <span className="rail-mark" style={{ background: "#14746f" }}>
              L
            </span>
            <span>
              <span className="brand-name" style={{ color: "#fff" }}>
                LabOps
              </span>
              <span className="brand-sub" style={{ color: "#8fada6", display: "block" }}>
                Laboratorium Ilmu Komputer ITG
              </span>
            </span>
          </div>
          <h2>Satu tempat untuk seluruh operasional lab.</h2>
          <p>
            Jadwal, peminjaman, kendala, absensi, dan inventaris tercatat dalam satu alur — bukan lagi tersebar
            di grup chat dan spreadsheet.
          </p>
          <ul className="auth-points">
            <li>
              <Icon name="check" size={15} /> Konflik jadwal dicegah sebelum diajukan
            </li>
            <li>
              <Icon name="check" size={15} /> Persetujuan peminjaman tercatat dan bertanggal
            </li>
            <li>
              <Icon name="check" size={15} /> Kendala punya tiket, penanggung jawab, dan tenggat
            </li>
          </ul>
        </div>
        <p style={{ fontSize: 13.5, color: "#6f8b85", position: "relative", zIndex: 1, margin: 0 }}>
          Institut Teknologi Garut · Jurusan Ilmu Komputer
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h1 className="auth-title">Masuk ke LabOps</h1>
          <p className="auth-sub">Gunakan akun institusi Anda.</p>

          <form onSubmit={onSubmit} className="form-grid" noValidate>
            <div className="field">
              <label htmlFor="email">Email atau username</label>
              <input
                id="email"
                className="input"
                type="text"
                autoComplete="username"
                inputMode="email"
                placeholder="instruktur01 atau nama@labops.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="field-hint">
                Bisa memakai email lengkap atau username, mis. <code>instruktur01</code>.
              </span>
            </div>
            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="input"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 72 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowPass((v) => !v)}
                  style={{ position: "absolute", right: 2, top: 2, minHeight: 32 }}
                >
                  {showPass ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <button className="btn" type="submit" disabled={loading} style={{ width: "100%", minHeight: 38 }}>
              {loading ? "Memeriksa…" : "Masuk"}
            </button>
          </form>

          <div className="demo-accounts">
            <strong style={{ color: "var(--ink)" }}>Akun demo</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              <button type="button" className="chip" onClick={() => fill("admin")}>
                Admin
              </button>
              <button type="button" className="chip" onClick={() => fill("koordinator")}>
                Koordinator
              </button>
              <button type="button" className="chip" onClick={() => fill("kaprodi-tif")}>
                Kaprodi TIF
              </button>
              <button type="button" className="chip" onClick={() => fill("kaprodi-sis")}>
                Kaprodi SIS
              </button>
            </div>

            <details className="instruktur-accounts">
              <summary>Akun instruktur (7) — klik untuk isi otomatis</summary>
              <div className="credential-list">
                {INSTRUKTUR_ACCOUNTS.map((a) => (
                  <button
                    key={a.username}
                    type="button"
                    className="credential-item"
                    onClick={() => fillCredential(a.username, a.password)}
                    title={`Isi formulir dengan ${a.username}`}
                  >
                    <span>
                      <strong>{a.username}</strong> · {a.nama}
                    </span>
                    <code>{a.password}</code>
                  </button>
                ))}
              </div>
            </details>

            <div style={{ marginTop: 8 }}>
              Server: <code>{API_BASE.replace(/^https?:\/\//, "")}</code>
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-soft)" }}>
            <a href="/">← Kembali ke halaman informasi</a>
          </p>
        </div>
      </main>
    </div>
  );
}
