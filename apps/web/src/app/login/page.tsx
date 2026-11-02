"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API_BASE } from "@/lib/api";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/dashboard");
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
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Tidak dapat masuk. Periksa email dan kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  function fill(role: "admin" | "koordinator" | "dosen" | "mahasiswa") {
    const map = {
      admin: ["admin@labops.local", "admin123"],
      koordinator: ["koordinator@labops.local", "koord123"],
      dosen: ["drdedekurniadimkom@labops.local", "dosen123"],
      mahasiswa: ["mhs01@labops.local", "mhs123"],
    } as const;
    setEmail(map[role][0]);
    setPassword(map[role][1]);
    setError("");
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
        <p style={{ fontSize: 11, color: "#6f8b85", position: "relative", zIndex: 1, margin: 0 }}>
          Institut Teknologi Garut · Jurusan Ilmu Komputer
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h1 className="auth-title">Masuk ke LabOps</h1>
          <p className="auth-sub">Gunakan akun institusi Anda.</p>

          <form onSubmit={onSubmit} className="form-grid" noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="nama@labops.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
              <button type="button" className="chip" onClick={() => fill("dosen")}>
                Dosen
              </button>
              <button type="button" className="chip" onClick={() => fill("mahasiswa")}>
                Mahasiswa
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              Server: <code>{API_BASE.replace(/^https?:\/\//, "")}</code>
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: 11.5, color: "var(--ink-soft)" }}>
            <a href="/">← Kembali ke halaman informasi</a>
          </p>
        </div>
      </main>
    </div>
  );
}
