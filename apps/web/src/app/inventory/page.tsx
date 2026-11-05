"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { downloadCsv } from "@/lib/export";

const KONDISI = ["BAIK", "PERLU_PERAWATAN", "RUSAK", "DIHAPUSKAN"];
const KATEGORI = ["PC", "JARINGAN", "PERIFERAL", "PERANGKAT_PENDUKUNG"];

const KONDISI_LABEL: Record<string, string> = {
  BAIK: "Baik",
  PERLU_PERAWATAN: "Perlu perawatan",
  RUSAK: "Rusak",
  DIHAPUSKAN: "Dihapuskan",
};
const KONDISI_BADGE: Record<string, string> = {
  BAIK: "badge-success",
  PERLU_PERAWATAN: "badge-warning",
  RUSAK: "badge-danger",
  DIHAPUSKAN: "badge-muted",
};

const EMPTY = { kodeAset: "", nama: "", kategori: "PC", labId: "", kondisi: "BAIK", tanggalPerolehan: "", catatan: "" };

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [filterLab, setFilterLab] = useState("");
  const [filterKondisi, setFilterKondisi] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [mutateItem, setMutateItem] = useState<any>(null);
  const [mutateLab, setMutateLab] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = me?.role === "ADMIN_SYSTEM";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLab) params.set("labId", filterLab);
      if (filterKondisi) params.set("kondisi", filterKondisi);
      if (filterKategori) params.set("kategori", filterKategori);
      const [list, labList, meRes] = await Promise.all([
        api<any[]>(`/inventory?${params.toString()}`),
        api<any[]>("/labs"),
        api<{ user: any }>("/auth/me"),
      ]);
      setItems(list);
      setLabs(labList);
      setMe(meRes.user);
    } catch (e: any) {
      setMsg({ type: "danger", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [filterLab, filterKondisi, filterKategori]);

  useEffect(() => {
    // Dukungan tautan langsung dari dasbor: /inventory?labId=...
    const labId = new URLSearchParams(window.location.search).get("labId");
    if (labId) setFilterLab(labId);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) => it.kodeAset?.toLowerCase().includes(q) || it.nama?.toLowerCase().includes(q) || it.lab?.kode?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { BAIK: 0, PERLU_PERAWATAN: 0, RUSAK: 0, DIHAPUSKAN: 0 };
    for (const it of items) base[it.kondisi] = (base[it.kondisi] || 0) + 1;
    return base;
  }, [items]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const body: any = { ...form, kapasitas: undefined };
      if (!body.tanggalPerolehan) delete body.tanggalPerolehan;
      if (!body.catatan) delete body.catatan;
      await api("/inventory", { method: "POST", body });
      setMsg({ type: "success", text: `Item ${form.kodeAset} ditambahkan.` });
      setForm({ ...EMPTY, labId: form.labId });
      setShowForm(false);
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function updateKondisi(id: string, kondisi: string) {
    try {
      await api(`/inventory/${id}`, { method: "PUT", body: { kondisi } });
      setMsg({ type: "success", text: "Kondisi aset diperbarui." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function doMutate() {
    if (!mutateLab || !mutateItem) {
      setMsg({ type: "danger", text: "Pilih lab tujuan terlebih dahulu." });
      return;
    }
    try {
      await api(`/inventory/${mutateItem.id}/mutate`, { method: "PATCH", body: { labTujuanId: mutateLab } });
      setMsg({ type: "success", text: `${mutateItem.kodeAset} dipindahkan ke lab tujuan.` });
      setMutateItem(null);
      setMutateLab("");
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  async function remove(item: any) {
    if (!window.confirm(`Hapus ${item.kodeAset} — ${item.nama} dari inventaris?`)) return;
    try {
      await api(`/inventory/${item.id}`, { method: "DELETE" });
      setMsg({ type: "success", text: "Item dihapus dari daftar aktif." });
      load();
    } catch (err: any) {
      setMsg({ type: "danger", text: err.message });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventaris Lab</h1>
          <p className="page-subtitle">Aset per lab, kondisi perangkat, dan mutasi antar-ruang dalam satu catatan.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() =>
              downloadCsv(
                "inventaris-lab.csv",
                visible.map((it) => ({
                  kodeAset: it.kodeAset,
                  nama: it.nama,
                  kategori: it.kategori,
                  lab: it.lab?.kode,
                  kondisi: it.kondisi,
                  tanggalPerolehan: it.tanggalPerolehan ? new Date(it.tanggalPerolehan).toLocaleDateString("id-ID") : "",
                  catatan: it.catatan || "",
                })),
              )
            }
          >
            <Icon name="report" size={16} /> Ekspor CSV
          </button>
          {isAdmin && (
            <button className="btn" onClick={() => setShowForm((v) => !v)}>
              <Icon name={showForm ? "close" : "plus"} size={16} /> {showForm ? "Tutup form" : "Tambah aset"}
            </button>
          )}
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
            <Icon name="inventory" size={14} /> Total aset
          </span>
          <span className="ops-stat-value">{items.length}</span>
          <span className="ops-stat-note">{filterLab ? "pada lab terpilih" : "seluruh lab"}</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-label">
            <Icon name="check" size={14} /> Kondisi baik
          </span>
          <span className="ops-stat-value">{counts.BAIK}</span>
          <span className="ops-stat-note">siap digunakan</span>
        </div>
        <div className={`ops-stat ${counts.PERLU_PERAWATAN ? "is-alert" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="refresh" size={14} /> Perlu perawatan
          </span>
          <span className="ops-stat-value">{counts.PERLU_PERAWATAN}</span>
          <span className="ops-stat-note">jadwalkan pemeriksaan</span>
        </div>
        <div className={`ops-stat ${counts.RUSAK ? "is-danger" : ""}`}>
          <span className="ops-stat-label">
            <Icon name="alert" size={14} /> Rusak
          </span>
          <span className="ops-stat-value">{counts.RUSAK}</span>
          <span className="ops-stat-note">perlu perbaikan atau penggantian</span>
        </div>
      </div>

      {showForm && isAdmin && (
        <div className="card reveal" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h2 className="card-title">Aset baru</h2>
              <p className="card-note">Kode aset harus unik dan mengikuti pola inventaris laboratorium.</p>
            </div>
          </div>
          <form onSubmit={create} className="form-grid">
            <div className="form-row">
              <div className="field">
                <label htmlFor="inv-kode">Kode aset</label>
                <input id="inv-kode" className="input" placeholder="INV-C101-PC-21" value={form.kodeAset} onChange={(e) => setForm({ ...form, kodeAset: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="inv-nama">Nama aset</label>
                <input id="inv-nama" className="input" placeholder="PC All-in-One 21" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="inv-kategori">Kategori</label>
                <select id="inv-kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                  {KATEGORI.map((k) => (
                    <option key={k} value={k}>
                      {k.replaceAll("_", " ").toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="inv-lab">Lab</label>
                <select id="inv-lab" value={form.labId} onChange={(e) => setForm({ ...form, labId: e.target.value })} required>
                  <option value="">Pilih lab</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.kode} — {l.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="inv-kondisi">Kondisi awal</label>
                <select id="inv-kondisi" value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })}>
                  {KONDISI.filter((k) => k !== "DIHAPUSKAN").map((k) => (
                    <option key={k} value={k}>
                      {KONDISI_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="inv-tanggal">Tanggal perolehan</label>
                <input id="inv-tanggal" className="input" type="date" value={form.tanggalPerolehan} onChange={(e) => setForm({ ...form, tanggalPerolehan: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="inv-catatan">Catatan</label>
              <input id="inv-catatan" className="input" placeholder="Nomor seri, sumber pengadaan, atau keterangan lain" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
            </div>
            <div>
              <button className="btn" type="submit">
                Simpan aset
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 220px", minWidth: 200 }}>
            <label htmlFor="inv-search">Cari</label>
            <div style={{ position: "relative" }}>
              <input id="inv-search" className="input" placeholder="Kode aset, nama, lab…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              <span style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }}>
                <Icon name="search" size={15} />
              </span>
            </div>
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label htmlFor="inv-filter-lab">Lab</label>
            <select id="inv-filter-lab" value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
              <option value="">Semua lab</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.kode}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label htmlFor="inv-filter-kategori">Kategori</label>
            <select id="inv-filter-kategori" value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
              <option value="">Semua kategori</option>
              {KATEGORI.map((k) => (
                <option key={k} value={k}>
                  {k.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="chip-row" style={{ marginTop: 12 }}>
          <button type="button" className={`chip ${filterKondisi === "" ? "is-active" : ""}`} onClick={() => setFilterKondisi("")}>
            Semua kondisi
          </button>
          {KONDISI.map((k) => (
            <button type="button" key={k} className={`chip ${filterKondisi === k ? "is-active" : ""}`} onClick={() => setFilterKondisi(k)}>
              {KONDISI_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Kode aset</th>
              <th>Nama</th>
              <th>Kategori</th>
              <th>Lab</th>
              <th>Kondisi</th>
              <th>Perolehan</th>
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
                    <Icon name="inventory" size={24} />
                    <p className="empty-title">Tidak ada aset pada filter ini</p>
                    <p className="empty-text">Ubah filter lab, kategori, atau kondisi.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visible.map((it) => (
                <tr key={it.id}>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {it.kodeAset}
                  </td>
                  <td>
                    <div>{it.nama}</div>
                    {it.catatan && <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{it.catatan}</div>}
                  </td>
                  <td>{it.kategori.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="num">{it.lab?.kode}</td>
                  <td>
                    {isAdmin ? (
                      <select className="input" style={{ width: 170, padding: "4px 8px", minHeight: 30 }} value={it.kondisi} onChange={(e) => updateKondisi(it.id, e.target.value)} aria-label={`Kondisi ${it.kodeAset}`}>
                        {KONDISI.map((k) => (
                          <option key={k} value={k}>
                            {KONDISI_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge ${KONDISI_BADGE[it.kondisi] || "badge-muted"}`}>{KONDISI_LABEL[it.kondisi] || it.kondisi}</span>
                    )}
                  </td>
                  <td className="num">{it.tanggalPerolehan ? new Date(it.tanggalPerolehan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                  <td>
                    {isAdmin ? (
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setMutateItem(it)}>
                          Mutasi
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(it)}>
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <span className="badge badge-plain">hanya lihat</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mutateItem && (
        <div className="panel reveal">
          <div className="card-head">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Mutasi {mutateItem.kodeAset}
              </h3>
              <p className="card-note">
                Pindahkan {mutateItem.nama} dari {mutateItem.lab?.kode} ke lab lain. Riwayat mutasi tersimpan.
              </p>
            </div>
            <button className="icon-btn" onClick={() => { setMutateItem(null); setMutateLab(""); }} aria-label="Tutup">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="input" style={{ maxWidth: 320 }} value={mutateLab} onChange={(e) => setMutateLab(e.target.value)}>
              <option value="">Pilih lab tujuan</option>
              {labs
                .filter((l) => l.id !== mutateItem.labId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.kode} — {l.nama}
                  </option>
                ))}
            </select>
            <button className="btn" onClick={doMutate} disabled={!mutateLab}>
              Pindahkan
            </button>
          </div>
        </div>
      )}
    </>
  );
}
