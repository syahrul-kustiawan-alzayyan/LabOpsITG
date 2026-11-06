"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, withPeriode, getSelectedPeriodeId } from "@/lib/api";
import { Icon, IconName } from "@/components/Icon";
import { labDisplayName, labRoom } from "@/lib/lab-label";

const STATUS_ISSUE: Record<string, string> = {
  BARU: "Baru",
  DIVERIFIKASI: "Diverifikasi",
  DALAM_PENANGANAN: "Ditangani",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

const BADGE_ISSUE: Record<string, string> = {
  BARU: "badge-warning",
  DIVERIFIKASI: "badge-info",
  DALAM_PENANGANAN: "badge-info",
  SELESAI: "badge-success",
  DITOLAK: "badge-danger",
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtShort(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function KoordinatorPage() {
  const [me, setMe] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [labs, setLabs] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [assetSummary, setAssetSummary] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    let alive = true;
    try {
      const meRes = await api<{ user: any }>("/auth/me");
      if (!alive) return;
      setMe(meRes.user);

      const per = withPeriode({});
      const todayUrl = "/reports/today" + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const dashUrl = "/reports/dashboard" + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const coursesUrl = "/courses" + (Object.keys(per).length ? "?" + new URLSearchParams(per as Record<string, string>).toString() : "");
      const [t, d, l, c, inv, p, apps, pendingBookings, issueList] = await Promise.all([
        api<any>(todayUrl),
        api<any>(dashUrl),
        api<any[]>("/labs"),
        api<any[]>(coursesUrl),
        api<any[]>("/inventory/summary").catch(() => []),
        api<any[]>("/recruitment/periods").catch(() => []),
        api<any[]>("/recruitment/applications").catch(() => []),
        api<any[]>("/bookings?status=DIAJUKAN&limit=5").catch(() => []),
        api<any[]>("/issues?limit=8").catch(() => []),
      ]);
      if (!alive) return;

      setToday(t);
      setDashboard(d);
      setLabs(l);
      setCourses(c);
      setAssetSummary(inv);
      setPeriods(p);
      setApplications(apps);
      setPending(pendingBookings);
      setIssues(issueList.filter((i) => !["SELESAI", "DITOLAK"].includes(i.status)));
    } catch (e: any) {
      if (alive) setError(e?.message || "Tidak dapat memuat dasbor koordinator.");
    } finally {
      if (alive) setLoading(false);
    }
  }, [getSelectedPeriodeId()]);

  useEffect(() => {
    load();
  }, [load]);

  // Muat ulang data saat periode diganti dari sidebar
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("labops:periode-changed", handler);
    return () => window.removeEventListener("labops:periode-changed", handler);
  }, [load]);

  const activeCourses = useMemo(
    () => courses.filter((c) => c.status === "AKTIF"),
    [courses],
  );

  const openPeriods = useMemo(() => {
    const now = new Date(new Date().toDateString());
    return periods
      .filter((p) => p.status === "DIBUKA" && new Date(p.tenggat) >= now)
      .sort((a, b) => new Date(a.tenggat).getTime() - new Date(b.tenggat).getTime());
  }, [periods]);

  const pendingApplications = useMemo(
    () => applications.filter((a) => ["DIAJUKAN", "DIPROSES", "WAWANCARA"].includes(a.status)),
    [applications],
  );

  const rooms = useMemo(() => {
    const map = new Map<string, { total: number; BAIK: number; PERLU_PERAWATAN: number; RUSAK: number; DIHAPUSKAN: number }>();
    for (const lab of labs) {
      map.set(lab.id, { total: 0, BAIK: 0, PERLU_PERAWATAN: 0, RUSAK: 0, DIHAPUSKAN: 0 });
    }
    for (const row of assetSummary) {
      const entry = map.get(row.labId);
      if (!entry) continue;
      const count = row._count?._all || 0;
      entry.total += count;
      if (row.kondisi in entry) (entry as any)[row.kondisi] += count;
    }
    return labs
      .map((lab) => ({ lab, ...(map.get(lab.id) || { total: 0, BAIK: 0, PERLU_PERAWATAN: 0, RUSAK: 0, DIHAPUSKAN: 0 }) }))
      .sort((a, b) => (a.lab.kode || "").localeCompare(b.lab.kode || ""));
  }, [labs, assetSummary]);

  const totalAssets = useMemo(() => rooms.reduce((sum, r) => sum + r.total, 0), [rooms]);
  const needAttention = useMemo(
    () => rooms.reduce((sum, r) => sum + r.PERLU_PERAWATAN + r.RUSAK, 0),
    [rooms],
  );

  const greeting = me?.nama ? me.nama.split(" ")[0] : "Rekan";
  const sessionsToday = today?.sessions || [];

  const MENU: {
    href: string;
    label: string;
    desc: string;
    icon: IconName;
    meta: string;
    accent?: boolean;
  }[] = [
    {
      href: "/courses",
      label: "Mata kuliah",
      desc: "Kelola mata kuliah praktikum, tim pengajar, dan kelas yang terdaftar.",
      icon: "book",
      meta: `${activeCourses.length} aktif · ${courses.length} terdaftar`,
    },
    {
      href: "/schedules",
      label: "Jadwal",
      desc: "Atur jadwal praktikum, ruangan, dan bentrok antar sesi.",
      icon: "calendar",
      meta: `${dashboard?.schedules ?? 0} jadwal aktif · ${sessionsToday.length} sesi hari ini`,
    },
    {
      href: "/bookings",
      label: "Peminjaman lab",
      desc: "Tinjau pengajuan pemakaian lab di luar jadwal praktikum.",
      icon: "booking",
      meta: `${today?.pendingBookings ?? 0} menunggu · ${today?.approvedToday ?? 0} disetujui hari ini`,
      accent: (today?.pendingBookings ?? 0) > 0,
    },
    {
      href: "/issues",
      label: "Kendala",
      desc: "Verifikasi laporan kerusakan dan tetapkan penanggung jawab.",
      icon: "issue",
      meta: `${today?.openIssues ?? 0} terbuka · ${today?.overdueIssues ?? 0} lewat tenggat`,
      accent: (today?.overdueIssues ?? 0) > 0,
    },
    {
      href: "/inventory",
      label: "Inventaris aset per ruangan",
      desc: "Pantau kondisi aset tiap laboratorium dan mutasi antar-ruang.",
      icon: "inventory",
      meta: `${totalAssets} aset · ${needAttention} perlu perhatian`,
      accent: needAttention > 0,
    },
    {
      href: "/recruitment?tab=kelola",
      label: "Buat lowongan instruktur/asdos",
      desc: "Buka periode rekrutmen dan kelola lamaran instruktur maupun asisten dosen.",
      icon: "recruitment",
      meta: `${openPeriods.length} lowongan dibuka · ${pendingApplications.length} lamaran diproses`,
    },
    {
      href: "/labs",
      label: "Lab",
      desc: "Kelola data laboratorium, kapasitas, lokasi, status, dan fasilitas di dalamnya.",
      icon: "lab",
      meta: `${labs.length} ruangan · ${totalAssets} aset tercatat`,
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <p className="hero-eyebrow" style={{ marginBottom: 6 }}>
            Dasbor koordinator laboratorium
          </p>
          <h1 className="page-title">Selamat datang, {greeting}</h1>
          <p className="page-subtitle">
            Kendali operasional laboratorium: mata kuliah, jadwal, peminjaman, kendala, aset ruangan,
            dan rekrutmen instruktur/asisten dosen.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/recruitment?tab=kelola" className="btn btn-secondary">
            <Icon name="plus" size={16} /> Buat lowongan
          </Link>
          <Link href="/schedules" className="btn">
            <Icon name="calendar" size={16} /> Kelola jadwal
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="ops-strip">
          {[0, 1, 2, 3].map((i) => (
            <div className="ops-stat" key={i}>
              <div className="skeleton" style={{ width: "55%" }} />
              <div className="skeleton" style={{ width: "35%", height: 26, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ops-strip reveal">
          <Link href="/bookings?status=DIAJUKAN" className={`ops-stat ${today?.pendingBookings ? "is-alert" : ""}`}>
            <span className="ops-stat-label">
              <Icon name="clock" size={14} /> Menunggu persetujuan
            </span>
            <span className="ops-stat-value">{today?.pendingBookings ?? 0}</span>
            <span className="ops-stat-note">pengajuan peminjaman lab</span>
          </Link>
          <Link href="/issues" className={`ops-stat ${today?.overdueIssues ? "is-danger" : ""}`}>
            <span className="ops-stat-label">
              <Icon name="issue" size={14} /> Kendala terbuka
            </span>
            <span className="ops-stat-value">{today?.openIssues ?? 0}</span>
            <span className="ops-stat-note">
              {today?.overdueIssues ? `${today.overdueIssues} melewati tenggat` : "semua dalam tenggat"}
            </span>
          </Link>
          <Link href="/inventory" className={`ops-stat ${needAttention ? "is-alert" : ""}`}>
            <span className="ops-stat-label">
              <Icon name="inventory" size={14} /> Aset perlu perhatian
            </span>
            <span className="ops-stat-value">{needAttention}</span>
            <span className="ops-stat-note">dari {totalAssets} aset di {rooms.length} ruangan</span>
          </Link>
          <Link href="/recruitment?tab=kelola" className="ops-stat">
            <span className="ops-stat-label">
              <Icon name="recruitment" size={14} /> Lowongan dibuka
            </span>
            <span className="ops-stat-value">{openPeriods.length}</span>
            <span className="ops-stat-note">{pendingApplications.length} lamaran belum final</span>
          </Link>
        </div>
      )}

      <div className="card-head" style={{ marginBottom: 10 }}>
        <div>
          <h2 className="card-title">Menu utama koordinator</h2>
          <p className="card-note">Enam area kerja yang paling sering Anda tangani.</p>
        </div>
      </div>

      <div className="coord-grid" style={{ marginBottom: 22 }}>
        {MENU.map((item) => (
          <Link key={item.href} href={item.href} className="coord-menu-card">
            <div className="coord-menu-top">
              <span className="coord-menu-icon">
                <Icon name={item.icon} size={19} />
              </span>
              <span className={`coord-menu-count ${item.accent ? "is-alert" : ""}`}>{item.meta}</span>
            </div>
            <h3>{item.label}</h3>
            <p>{item.desc}</p>
            <span className="coord-menu-foot">
              Buka menu <Icon name="chevron" size={13} />
            </span>
          </Link>
        ))}
      </div>

      <div className="coord-split">
        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Antrean persetujuan peminjaman</h2>
              <p className="card-note">Pengajuan terbaru yang menunggu keputusan.</p>
            </div>
            <Link href="/bookings?status=DIAJUKAN" className="btn btn-secondary btn-sm">
              Kelola <Icon name="chevron" size={13} />
            </Link>
          </div>
          <div className="popover-list" style={{ maxHeight: 320 }}>
            {pending.length === 0 ? (
              <div className="empty">
                <Icon name="check" size={22} />
                <p className="empty-title">Antrean bersih</p>
                <p className="empty-text">Tidak ada pengajuan peminjaman yang menunggu.</p>
              </div>
            ) : (
              pending.map((b) => (
                <Link key={b.id} href="/bookings?status=DIAJUKAN" className="notif is-unread">
                  <strong>{b.keperluan}</strong>
                  <span className="notif-meta">
                    <span>
                      {b.lab?.kode} · {fmtShort(b.tanggal)} · {b.jamMulai}–{b.jamSelesai}
                    </span>
                    <span>{b.peminjam?.nama || b.namaPeminjam || "Publik"}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Kendala perlu ditangani</h2>
              <p className="card-note">Laporan aktif beserta tenggat penanganannya.</p>
            </div>
            <Link href="/issues" className="btn btn-secondary btn-sm">
              Kelola <Icon name="chevron" size={13} />
            </Link>
          </div>
          <div className="popover-list" style={{ maxHeight: 320 }}>
            {issues.length === 0 ? (
              <div className="empty">
                <Icon name="check" size={22} />
                <p className="empty-title">Tidak ada kendala terbuka</p>
                <p className="empty-text">Semua laporan sudah selesai atau ditolak.</p>
              </div>
            ) : (
              issues.slice(0, 6).map((i) => (
                <Link key={i.id} href="/issues" className="notif">
                  <strong>{i.nomorTiket} · {i.deskripsi}</strong>
                  <span className="notif-meta">
                    <span>
                      {i.lab?.kode} · {i.kategori} · tenggat {fmtDate(i.dueAt)}
                    </span>
                    <span className={`badge ${BADGE_ISSUE[i.status] || "badge-muted"}`}>
                      {STATUS_ISSUE[i.status] || i.status}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="coord-split" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Aset per ruangan</h2>
              <p className="card-note">Ringkasan kondisi inventaris tiap laboratorium.</p>
            </div>
            <Link href="/inventory" className="btn btn-secondary btn-sm">
              Inventaris <Icon name="chevron" size={13} />
            </Link>
          </div>
          {rooms.length === 0 ? (
            <div className="empty" style={{ padding: "24px 0" }}>
              <Icon name="lab" size={20} />
              <p className="empty-title">Belum ada ruangan</p>
              <p className="empty-text">Tambahkan lab untuk mulai mencatat aset.</p>
            </div>
          ) : (
            <div className="room-list">
              {rooms.map((r) => (
                <div className="room-row" key={r.lab.id}>
                  <div>
                    <Link href={`/inventory?labId=${r.lab.id}`} className="room-name room-link">
                      {labDisplayName(r.lab.nama, r.lab.kode)}
                    </Link>
                    <div className="room-sub">
                      {r.lab.kode} · {labRoom(r.lab.nama, r.lab.lokasi)} · {r.total} aset
                    </div>
                  </div>
                  <div className="room-cond">
                    <span className="badge badge-success">{r.BAIK} baik</span>
                    <span className={`badge ${r.PERLU_PERAWATAN ? "badge-warning" : "badge-muted"}`}>
                      {r.PERLU_PERAWATAN} perawatan
                    </span>
                    <span className={`badge ${r.RUSAK ? "badge-danger" : "badge-muted"}`}>
                      {r.RUSAK} rusak
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Lowongan instruktur &amp; asdos</h2>
              <p className="card-note">Periode rekrutmen yang sedang berjalan.</p>
            </div>
            <Link href="/recruitment?tab=kelola" className="btn btn-secondary btn-sm">
              Kelola <Icon name="chevron" size={13} />
            </Link>
          </div>
          {openPeriods.length === 0 ? (
            <div className="empty" style={{ padding: "24px 0" }}>
              <Icon name="recruitment" size={20} />
              <p className="empty-title">Belum ada lowongan dibuka</p>
              <p className="empty-text">Buka periode rekrutmen untuk instruktur atau asisten dosen.</p>
              <Link href="/recruitment?tab=kelola" className="btn btn-sm" style={{ marginTop: 10 }}>
                <Icon name="plus" size={14} /> Buat lowongan
              </Link>
            </div>
          ) : (
            <div className="room-list">
              {openPeriods.slice(0, 5).map((p) => {
                const days = Math.max(0, Math.ceil((new Date(p.tenggat).getTime() - Date.now()) / 86400000));
                return (
                  <div className="room-row" key={p.id}>
                    <div>
                      <div className="room-name">
                        {p.tipe === "INSTRUKTUR" ? "Instruktur" : "Asisten Dosen"} · {p.mataKuliah}
                      </div>
                      <div className="room-sub">
                        Kuota {p.kuota} · tenggat {fmtDate(p.tenggat)}
                      </div>
                    </div>
                    <span className={`badge ${days <= 3 ? "badge-warning" : "badge-info"}`}>
                      {days} hari lagi
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">Sesi laboratorium hari ini</h2>
            <p className="card-note">
              {sessionsToday.length} sesi terjadwal · {today?.labsActive ?? 0} lab aktif
            </p>
          </div>
          <Link href="/schedules" className="btn btn-secondary btn-sm">
            Semua jadwal <Icon name="chevron" size={13} />
          </Link>
        </div>
        {sessionsToday.length === 0 ? (
          <div className="empty" style={{ padding: "24px 0" }}>
            <Icon name="calendar" size={20} />
            <p className="empty-title">Tidak ada sesi hari ini</p>
            <p className="empty-text">Laboratorium tidak dipakai untuk praktikum hari ini.</p>
          </div>
        ) : (
          <div className="room-list">
            {sessionsToday.slice(0, 6).map((s: any) => (
              <div className="room-row" key={s.id}>
                <div>
                  <div className="room-name">
                    {s.jamMulai}–{s.jamSelesai} · {s.mataKuliah || "Praktikum"}
                  </div>
                  <div className="room-sub">
                    {s.kelas || s.namaKelas || "-"} · {s.lab?.kode} · {s.pengampu?.nama || "Belum ada pengampu"}
                  </div>
                </div>
                <Link href="/schedules" className="btn btn-ghost btn-sm">
                  Detail <Icon name="chevron" size={12} />
                </Link>
              </div>
            ))}
            {sessionsToday.length > 6 && (
              <div className="room-row" style={{ justifyContent: "center" }}>
                <Link href="/schedules" className="btn btn-secondary btn-sm">
                  Lihat {sessionsToday.length - 6} sesi lainnya
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
