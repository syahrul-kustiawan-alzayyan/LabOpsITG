"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { ScheduleGrid } from "@/components/ScheduleGrid";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type Today = {
  date: string;
  pendingBookings: number;
  approvedToday: number;
  openIssues: number;
  overdueIssues: number;
  sessionsToday: number;
  attendanceToday: number;
  labsActive: number;
  enrolledToday: number;
  sessions: any[];
};

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const meRes = await api<{ user: any }>("/auth/me");
        if (!alive) return;
        setMe(meRes.user);
        const manager = ["ADMIN_SYSTEM", "COORDINATOR", "LEADER"].includes(meRes.user.role);

        const [t, l, mySch, myBookings] = await Promise.all([
          api<Today>("/reports/today"),
          api<any[]>("/labs"),
          api<any[]>("/schedules/mine").catch(() => []),
          api<any[]>("/bookings?limit=50"),
        ]);
        if (!alive) return;
        setToday(t);
        setLabs(l);
        setMine(mySch);
        setBookings(myBookings);

        if (manager) {
          const [p, i] = await Promise.all([
            api<any[]>("/bookings?status=DIAJUKAN&limit=8"),
            api<any[]>("/issues?limit=8"),
          ]);
          if (!alive) return;
          setPending(p);
          setIssues(i.filter((x) => !["SELESAI", "DITOLAK"].includes(x.status)));
        }
      } catch {
        /* Chrome menangani redirect bila sesi habis */
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const manager = me && ["ADMIN_SYSTEM", "COORDINATOR", "LEADER"].includes(me.role);
  const isCoordinator = me && ["ADMIN_SYSTEM", "COORDINATOR"].includes(me.role);
  const todayName = new Date().getDay();

  const todaySchedules = useMemo(() => {
    const source = me?.role === "USER" ? mine || [] : today?.sessions?.length ? today.sessions : [];
    return source.filter((s: any) => (s.day ?? s.hari) === undefined || (s.hari ?? todayName) === todayName);
  }, [mine, today, me, todayName]);

  const todayBookings = bookings.filter(
    (b) => new Date(b.tanggal).toDateString() === new Date().toDateString() && ["DIAJUKAN", "DISETUJUI"].includes(b.status),
  );

  const greeting = me?.nama ? me.nama.split(" ")[0] : "Rekan";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Selamat datang, {greeting}</h1>
          <p className="page-subtitle">
            {manager
              ? "Papan kerja hari ini: antrean persetujuan, sesi yang berjalan, dan kendala yang perlu ditangani."
              : "Jadwal praktikum Anda, status peminjaman, dan hal yang perlu ditindaklanjuti."}
          </p>
        </div>
        <div className="page-actions">
          <Link href="/bookings" className="btn btn-secondary">
            <Icon name="booking" size={16} /> Ajukan peminjaman
          </Link>
          <Link href="/issues" className="btn">
            <Icon name="issue" size={16} /> Lapor kendala
          </Link>
        </div>
      </div>

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
          {isCoordinator && (
            <Link href="/bookings?status=DIAJUKAN" className={`ops-stat ${today?.pendingBookings ? "is-alert" : ""}`}>
              <span className="ops-stat-label">
                <Icon name="clock" size={14} /> Menunggu persetujuan
              </span>
              <span className="ops-stat-value">{today?.pendingBookings ?? 0}</span>
              <span className="ops-stat-note">pengajuan peminjaman</span>
            </Link>
          )}
          {!isCoordinator && (
            <div className="ops-stat">
              <span className="ops-stat-label">
                <Icon name="calendar" size={14} /> Kelas saya hari ini
              </span>
              <span className="ops-stat-value">{todaySchedules.length}</span>
              <span className="ops-stat-note">{HARI[todayName]}</span>
            </div>
          )}
          <Link href="/issues" className={`ops-stat ${today?.overdueIssues ? "is-danger" : ""}`}>
            <span className="ops-stat-label">
              <Icon name="issue" size={14} /> Kendala terbuka
            </span>
            <span className="ops-stat-value">{today?.openIssues ?? 0}</span>
            <span className="ops-stat-note">
              {today?.overdueIssues ? `${today.overdueIssues} melewati tenggat` : "semua dalam tenggat"}
            </span>
          </Link>
          <div className="ops-stat">
            <span className="ops-stat-label">
              <Icon name="calendar" size={14} /> Sesi hari ini
            </span>
            <span className="ops-stat-value">{today?.sessionsToday ?? 0}</span>
            <span className="ops-stat-note">{today?.labsActive ?? 0} lab aktif</span>
          </div>
          <Link href="/attendance" className="ops-stat">
            <span className="ops-stat-label">
              <Icon name="attendance" size={14} /> Absensi hari ini
            </span>
            <span className="ops-stat-value">{today?.attendanceToday ?? 0}</span>
            <span className="ops-stat-note">{today?.enrolledToday ?? 0} peserta terdaftar</span>
          </Link>
        </div>
      )}

      <div className="card card-flush reveal reveal-2" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h2 className="card-title">
              {me?.role === "USER" ? "Jadwal saya hari ini" : "Peta lab hari ini"} · {HARI[todayName]}
            </h2>
            <p className="card-note">Klik blok untuk membuka jadwal lab terkait.</p>
          </div>
          <Link href="/schedules" className="btn btn-secondary btn-sm">
            Semua jadwal <Icon name="chevron" size={13} />
          </Link>
        </div>
        <div style={{ padding: "0 0 0" }}>
          <ScheduleGrid schedules={todaySchedules} labs={labs} emptyLabel="Tidak ada sesi terjadwal hari ini" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div className="card card-flush">
          <div className="card-head">
            <div>
              <h2 className="card-title">Perlu tindakan</h2>
              <p className="card-note">{manager ? "Antrean persetujuan dan kendala aktif." : "Peminjaman dan kendala Anda yang masih berjalan."}</p>
            </div>
          </div>
          <div className="popover-list" style={{ maxHeight: 340 }}>
            {manager ? (
              <>
                {pending.map((b) => (
                  <Link key={b.id} href="/bookings" className="notif is-unread">
                    <strong>{b.keperluan}</strong>
                    <span className="notif-meta">
                      <span>
                        {b.lab?.kode} · {new Date(b.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} · {b.jamMulai}–{b.jamSelesai}
                      </span>
                      <span>menunggu</span>
                    </span>
                  </Link>
                ))}
                {issues.map((i) => (
                  <Link key={i.id} href="/issues" className="notif">
                    <strong>{i.nomorTiket}</strong> · {i.deskripsi}
                    <span className="notif-meta">
                      <span>
                        {i.lab?.kode} · {i.kategori}
                      </span>
                      <span>{i.urgensi}</span>
                    </span>
                  </Link>
                ))}
                {pending.length === 0 && issues.length === 0 && (
                  <div className="empty">
                    <Icon name="check" size={22} />
                    <p className="empty-title">Antrean bersih</p>
                    <p className="empty-text">Tidak ada persetujuan atau kendala yang menunggu.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {bookings.slice(0, 5).map((b) => (
                  <Link key={b.id} href="/bookings" className="notif">
                    <strong>{b.keperluan}</strong>
                    <span className="notif-meta">
                      <span>
                        {b.lab?.kode} · {new Date(b.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} · {b.jamMulai}–{b.jamSelesai}
                      </span>
                      <span>{b.status}</span>
                    </span>
                  </Link>
                ))}
                {bookings.length === 0 && (
                  <div className="empty">
                    <Icon name="booking" size={22} />
                    <p className="empty-title">Belum ada peminjaman</p>
                    <p className="empty-text">Ajukan peminjaman lab di luar jadwal praktikum.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Peminjaman hari ini</h2>
          <p className="card-note" style={{ marginBottom: 14 }}>
            Slot yang sudah disetujui dan pengajuan baru.
          </p>
          {todayBookings.length === 0 ? (
            <div className="empty" style={{ padding: "24px 0" }}>
              <Icon name="calendar" size={20} />
              <p className="empty-title">Tidak ada peminjaman hari ini</p>
              <p className="empty-text">Lab sepenuhnya mengikuti jadwal praktikum.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {todayBookings.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15.5 }}>{b.keperluan}</div>
                    <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                      {b.lab?.kode} · {b.jamMulai}–{b.jamSelesai}
                    </div>
                  </div>
                  <span className={`badge ${b.status === "DISETUJUI" ? "badge-success" : "badge-warning"}`}>
                    {b.status === "DISETUJUI" ? "disetujui" : "menunggu"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <hr className="divider" />
          <div className="chip-row">
            <Link href="/schedules" className="chip">
              <Icon name="calendar" size={13} /> Jadwal
            </Link>
            <Link href="/inventory" className="chip">
              <Icon name="inventory" size={13} /> Inventaris
            </Link>
            <Link href="/attendance" className="chip">
              <Icon name="qr" size={13} /> Absensi
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
