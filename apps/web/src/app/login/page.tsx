"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Login gagal");
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
      <div className="card" style={{ width: 400, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="logo" style={{ width: 56, height: 56, margin: "0 auto 12px", fontSize: 24 }}>L</div>
          <h1 style={{ margin: 0, fontSize: 22 }}>LabOps Ilkom ITG</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Masuk ke sistem operasional lab</p>
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <div>
            <label>Email institusi</label>
            <input className="input" type="email" placeholder="nama@kampus.ac.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Kata sandi</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          Demo: admin@labops.local / admin123
        </p>
      </div>
    </div>
  );
}
