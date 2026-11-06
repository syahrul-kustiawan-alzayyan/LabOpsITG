"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, withPeriode, getSelectedPeriodeId } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { downloadCsv } from "@/lib/export";

const ROLES = [
  { value: "USER", label: "Pengguna" },
  { value: "COORDINATOR", label: "Koordinator" },
  { value: "LEADER", label: "Pimpinan" },
  { value: "ADMIN_SYSTEM", label: "Admin sistem" },
  { value: "INSTRUKTUR", label: "Instruktur" },
  { value: "ASISTEN_DOSEN", label: "Asisten Dosen" },
];
const SUB_ROLES = [
  { value: "DOSEN", label: "Dosen" },
  { value: "MAHASISWA", label: "Mahasiswa" },
];
const ROLE_BADGE: Record<string, string> = {
  ADMIN_SYSTEM: "badge-danger",
  COORDINATOR: "badge-info",
  LEADER: "badge-success",
  USER: "badge-muted",
  INSTRUKTUR: "badge-warning",
  ASISTEN_DOSEN: "badge-warning",
};

const EMPTY = { nama: "", email: "", password: "", role: "USER", subRoles: ["MAHASISWA"] as string[] };

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const per = withPeriode({ pageSize: "100" });
      const params = new URLSearchParams(per as Record<string, string>);
      if (filterRole) params.set("role", filterRole);
      if (filterStatus) params.set("status", filterStatus);
      setUsers(await api<any[]>(`/users?${params.toString()}`));
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterStatus, getSelectedPeriodeId()]);

  useEffect(() => {
    load();
  }, [load]);

  // Muat ulang pengguna saat periode diganti dari sidebar
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("labops:periode-changed", handler);
    return () => window.removeEventListener("labops:periode-changed", handler);
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.nama?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) map[u.role] = (map[u.role] || 0) + 1;
    return map;
  }, [users]);

  function toggleSubRole(value: string) {
    setForm((prev: any) => ({
      ...prev,
      subRoles: prev.subRoles.includes(value) ? prev.subRoles.filter((s: string) => s !== value) : [...prev.subRoles, value],
    }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      // Jika role adalah INSTRUKTUR/ASISTEN_DOSEN, subRoles dikosongkan (role langsung)
      const body = { ...form };
      if (body.role === "INSTRUKTUR" || body.role === "ASISTEN_DOSEN") {
        body.subRoles = [];
      }
      await api("/users", { method: "POST", body });
      setMsg({ type: "success", text: `Akun ${form.email} dibuat.` });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function resetPassword() {
    if (!resetUser) return;
    if (newPassword.length < 6) {
      setMsg({ type: "danger", text: "Kata sandi minimal 6 karakter." });
      return;
    }
    try {
      await api(`/users/${resetUser.id}/reset-password`, { method: "PATCH", body: { password: newPassword } });
      setMsg({ type: "success", text: `Kata sandi ${resetUser.nama} berhasil diubah.` });
      setResetUser(null);
      setNewPassword("");
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function deactivate(user: any) {
    if (!window.confirm(`Nonaktifkan akun ${user.nama}? Pengguna langsung kehilangan akses.`)) return;
    try {
      await api(`/users/${user.id}/deactivate`, { method: "PATCH" });
      setMsg({ type: "success", text: `Akun ${user.nama} dinonaktifkan.` });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengguna</h1>
          <p className="page-subtitle">Akun, peran, dan sub-peran. Perubahan peran berlaku pada permintaan berikutnya.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => downloadCsv("pengguna-lab.csv", visible.map((u) => ({ nama: u.nama, email: u.email, role: u.role, subRoles: (u.subRoles || []).join(";"), status: u.status })))}
          >
            <Icon name="report" size={16} /> Ekspor CSV
          </button>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? "close" : "plus"} size={16} /> {showForm ? "Tutup form" : "Tambah pengguna"}
          </button>
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
            <Icon name="users" size={14} /> Total akun
          </span>
          <span className="ops-stat-value">{users.length}</span>
          <span className="ops-stat-note">maksimal 100 akun terbaru</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">Admin & koordinator</span>
          <span className="ops-stat-value">{(counts.ADMIN_SYSTEM || 0) + (counts.COORDINATOR || 0)}</span>
          <span className="ops-stat-note">pengelola sistem</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">Pimpinan</span>
          <span className="ops-stat-value">{counts.LEADER || 0}</span>
          <span className="ops-stat-note">akses baca laporan</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">Pengguna biasa</span>
          <span className="ops-stat-value">{counts.USER || 0}</span>
          <span className="ops-stat-note">dosen & mahasiswa</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">Instruktur &amp; asdos</span>
          <span className="ops-stat-value">{(counts.INSTRUKTUR || 0) + (counts.ASISTEN_DOSEN || 0)}</span>
          <span className="ops-stat-note">peran langsung</span>
        </div>
      </div>

      {showForm && (
        <div className="card reveal" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h2 className="card-title">Akun baru</h2>
              <p className="card-note">Gunakan email institusi. Sub-peran menentukan tampilan fungsional dosen atau mahasiswa.</p>
            </div>
          </div>
          <form onSubmit={create} className="form-grid">
            <div className="form-row">
              <div className="field">
                <label htmlFor="u-nama">Nama lengkap</label>
                <input id="u-nama" className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="u-email">Email</label>
                <input id="u-email" className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="u-password">Kata sandi awal</label>
                <input id="u-password" className="input" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="u-role">Peran sistem</label>
                <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Sub-peran</label>
              <p className="card-note" style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
                Kosongkan jika peran sistem adalah Instruktur atau Asisten Dosen.
              </p>
              {form.role !== "INSTRUKTUR" && form.role !== "ASISTEN_DOSEN" && (
                <div className="chip-row">
                  {SUB_ROLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`chip ${form.subRoles.includes(s.value) ? "is-active" : ""}`}
                      onClick={() => toggleSubRole(s.value)}
                      aria-pressed={form.subRoles.includes(s.value)}
                    >
                      {form.subRoles.includes(s.value) && <Icon name="check" size={12} />} {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <button className="btn" type="submit">
                Simpan akun
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 240px", minWidth: 200 }}>
            <label htmlFor="u-search">Cari</label>
            <div style={{ position: "relative" }}>
              <input id="u-search" className="input" placeholder="Nama atau email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              <span style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }}>
                <Icon name="search" size={15} />
              </span>
            </div>
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label htmlFor="u-filter-role">Peran</label>
            <select id="u-filter-role" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="">Semua peran</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label htmlFor="u-filter-status">Status</label>
            <select id="u-filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Sub-peran</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="skeleton" style={{ height: 32 }} />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <Icon name="users" size={24} />
                    <p className="empty-title">Tidak ada akun pada filter ini</p>
                    <p className="empty-text">Ubah kata kunci atau filter peran.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.nama}</td>
                  <td className="num" style={{ fontSize: 14.5 }}>
                    {u.email}
                  </td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role] || "badge-muted"}`}>{ROLES.find((r) => r.value === u.role)?.label || u.role}</span>
                  </td>
                  <td>
                    <div className="chip-row">
                      {(u.subRoles || []).length === 0 ? (
                        <span style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>—</span>
                      ) : (
                        u.subRoles.map((s: string) => (
                          <span key={s} className="badge badge-plain">
                            {SUB_ROLES.find((x) => x.value === s)?.label || s}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.status === "ACTIVE" ? "badge-success" : "badge-muted"}`}>{u.status === "ACTIVE" ? "aktif" : "nonaktif"}</span>
                  </td>
                  <td className="num" style={{ fontSize: 14.5 }}>
                    {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setResetUser(u)}>
                        Reset sandi
                      </button>
                      {u.status === "ACTIVE" && (
                        <button className="btn btn-danger btn-sm" onClick={() => deactivate(u)}>
                          Nonaktifkan
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

      {resetUser && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Reset kata sandi · {resetUser.nama}
              </h3>
              <p className="card-note">Sampaikan kata sandi baru secara langsung; sistem tidak mengirim email.</p>
            </div>
            <button className="icon-btn" onClick={() => { setResetUser(null); setNewPassword(""); }} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ maxWidth: 280 }} type="password" placeholder="Kata sandi baru (min. 6 karakter)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button className="btn" onClick={resetPassword} disabled={newPassword.length < 6}>
              Simpan sandi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
