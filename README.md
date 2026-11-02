# LabOps Ilkom ITG

Sistem operasional Laboratorium Ilmu Komputer, Institut Teknologi Garut.
Monorepo pnpm + Turborepo: Next.js (web) dan NestJS (API) dengan PostgreSQL/Prisma.

## Fitur

- **Jadwal lab** — peta lab × jam, filter per lab/hari/semester, pencegahan konflik sesi.
- **Peminjaman** — pengajuan, pengecekan slot otomatis, persetujuan koordinator, penolakan dengan alasan, pembatalan, penyelesaian.
- **Kendala** — tiket bernomor, penanggung jawab, riwayat status, tenggat SLA per urgensi, lampiran foto.
- **Absensi** — token QR per sesi (berlaku 15 menit), QR statis lab sebagai cadangan, peserta kelas terdaftar, rekap dan koreksi.
- **Inventaris** — aset per lab, kondisi, mutasi antar-lab, keterkaitan dengan tiket kendala.
- **Rekrutmen** — periode, lamaran dengan berkas PDF, tahapan seleksi, keputusan otomatis menambah sub-peran.
- **Laporan & Prodi** — ringkasan status, laporan mingguan, dasbor pimpinan, ekspor CSV.
- **Notifikasi & audit** — notifikasi dalam aplikasi, jejak audit 100 aktivitas terakhir.
- **Halaman publik** — jadwal lab terbuka untuk mahasiswa tanpa login.

## Struktur

- `apps/web` — Next.js App Router (port 3000)
- `apps/api` — NestJS (port 4000)
- `packages/shared` — skema Zod, enum, tipe
- `prisma` — schema, migrasi, seed
- `e2e` — pengujian Playwright

## Prasyarat

- Node.js 20+
- pnpm 9+
- PostgreSQL 18 di port 5433, DB `labops`, user `labops`

## Konfigurasi

Salin `.env.example` menjadi `.env` di root (API juga membaca `apps/api/.env`):

```env
DATABASE_URL="postgresql://labops:labops@localhost:5433/labops?schema=public"
PORT=4000
WEB_ORIGIN="http://localhost:3000"
JWT_SECRET="ganti-dengan-rahasia-acak-minimal-32-karakter"
JWT_REFRESH_SECRET="ganti-dengan-rahasia-refresh-acak-minimal-32-karakter"
STORAGE_DRIVER="local"
STORAGE_LOCAL_PATH="./uploads"
```

Web memakai `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Menjalankan (dev)

```powershell
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev            # API :4000 dan web :3000
```

Buka http://localhost:3000. Halaman publik menampilkan jadwal; login untuk mengelola.

## Build produksi

```powershell
pnpm --filter @labops/api build
pnpm --filter @labops/web build
pnpm --filter @labops/api start
pnpm --filter @labops/web start
```

## Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin sistem | `admin@labops.local` | `admin123` |
| Koordinator lab | `koordinator@labops.local` | `koord123` |
| Dosen (contoh) | `drdedekurniadimkom@labops.local` | `dosen123` |
| Mahasiswa (contoh) | `mhs01@labops.local` | `mhs123` |

Dosen lain memakai pola `<slug nama>@labops.local` dengan kata sandi `dosen123`.
Mahasiswa `mhs01`–`mhs12` memakai `mhs123`.

## Halaman web

| Rute | Akses | Isi |
| --- | --- | --- |
| `/` | publik | Landing + peta jadwal lab |
| `/login` | publik | Masuk, tombol akun demo |
| `/dashboard` | semua peran | Papan kerja hari ini |
| `/schedules` | semua peran | Jadwal lab, filter, detail sesi |
| `/bookings` | semua peran | Pengajuan & persetujuan peminjaman |
| `/issues` | semua peran | Tiket kendala, triage, riwayat |
| `/attendance` | semua peran | Scan QR sesi, kelola peserta, rekap |
| `/inventory` | semua peran | Aset, kondisi, mutasi |
| `/staff` | semua peran | Instruktur & asisten dosen |
| `/recruitment` | semua peran | Periode & lamaran asisten |
| `/notifications` | semua peran | Daftar notifikasi |
| `/labs` | admin, koordinator | Manajemen lab & token QR |
| `/reports` | admin, koordinator, pimpinan | Laporan & analitik |
| `/prodi` | admin, koordinator, pimpinan | Dasbor program studi |
| `/audit` | admin, koordinator | Jejak audit |
| `/users` | admin | Manajemen pengguna |

## Endpoint API

### Auth
- `POST /auth/login` `{ email, password }`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

### Users
- `GET  /users?search=&role=&status=&page=&pageSize=`
- `POST /users` `{ nama, email, password, role?, subRoles? }`
- `PUT  /users/:id`
- `PATCH /users/:id/deactivate`
- `PATCH /users/:id/reset-password` `{ password }`
- `POST /users/import` `{ rows: [...] }`

### Labs
- `GET  /labs`
- `GET  /labs/:id`
- `POST /labs` `{ kode, nama, kapasitas, lokasi }`
- `PUT  /labs/:id`
- `PATCH /labs/:id/regenerate-qr`
- `DELETE /labs/:id`

### Schedules
- `GET  /schedules?labId=&pengampuId=&hari=&semester=`
- `GET  /schedules/mine` — sesi sebagai pengampu atau peserta
- `GET  /schedules/:id`
- `POST /schedules`
- `PUT  /schedules/:id`
- `DELETE /schedules/:id`
- `POST /schedules/:id/duplicate`
- `POST /schedules/import`

### Bookings
- `GET  /bookings?status=&labId=&peminjamId=&from=&to=&page=&pageSize=`
- `GET  /bookings/availability/check?labId=&tanggal=&jamMulai=&jamSelesai=`
- `GET  /bookings/:id`
- `POST /bookings` `{ labId, tanggal, jamMulai, jamSelesai, keperluan, jumlahPeserta?, kebutuhanKhusus? }`
- `PATCH /bookings/:id/approve`
- `PATCH /bookings/:id/reject` `{ alasan }`
- `PATCH /bookings/:id/cancel`
- `PATCH /bookings/:id/complete`

### Attendance
- `POST /attendance/scan` `{ qrToken }`
- `POST /attendance/session-token` `{ sesiId }` — token QR sesi, berlaku 15 menit
- `GET  /attendance/session-token/mine`
- `POST /attendance/manual` `{ sesiId, userId, status, reason }`
- `POST /attendance/request-correction` `{ sesiId, reason }`
- `GET  /attendance?sesiId=&userId=&labId=&from=&to=`
- `GET  /attendance/recap/:sesiId`
- `GET  /attendance/enrollments/:sesiId`
- `POST /attendance/enrollments` `{ sesiId, userId }`
- `DELETE /attendance/enrollments/:id`

### Issues
- `GET  /issues?status=&labId=&urgensi=&page=&pageSize=`
- `GET  /issues/:id` — termasuk riwayat status
- `POST /issues` `{ labId, kategori, urgensi, deskripsi, itemId?, fotoUrls? }`
- `PATCH /issues/:id/verify` `{ penanggungJawabId, catatan? }`
- `PATCH /issues/:id/status` `{ status, catatan? }`
- `PATCH /issues/:id/reopen` `{ catatan? }`

### Inventory
- `GET  /inventory?labId=&kondisi=&kategori=`
- `GET  /inventory/summary`
- `POST /inventory`
- `PUT  /inventory/:id`
- `PATCH /inventory/:id/mutate` `{ labTujuanId }`
- `DELETE /inventory/:id`
- `POST /inventory/import`

### Reports
- `GET /reports/dashboard`
- `GET /reports/today` — ringkasan operasional hari ini (Jakarta)
- `GET /reports/weekly?weekStart=&labId=&mataKuliah=`
- `GET /reports/usage?from=&to=&labId=`

### Recruitment
- `GET  /recruitment/periods?status=`
- `POST /recruitment/periods` `{ posisi, mataKuliah, kuota, persyaratan, tenggat }`
- `PATCH /recruitment/periods/:id`
- `PATCH /recruitment/periods/:id/close`
- `GET  /recruitment/applications?periodId=&status=`
- `GET  /recruitment/applications/mine`
- `POST /recruitment/applications`
- `PATCH /recruitment/applications/:id/status` `{ status, catatan? }`
- `PATCH /recruitment/applications/:id/interview` `{ tanggal }`

### Notifications, audit, files
- `GET  /notifications`
- `GET  /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `GET  /audit-logs`
- `POST /files/upload` (multipart field `file`; PNG/JPG/WEBP/PDF)
- `GET  /uploads/:filename`
- `GET  /health`

## Pengujian E2E

Playwright menguji alur publik, autentikasi, RBAC, peminjaman, kendala, absensi, dan tampilan responsif.

```powershell
pnpm exec playwright install chromium   # sekali saja
pnpm test:e2e                           # semua proyek (desktop + ponsel)
pnpm test:e2e:ui                        # mode UI interaktif
pnpm exec playwright test --project=chromium
pnpm exec playwright test e2e/bookings.spec.ts
```

Konfigurasi ada di `playwright.config.ts`. API dan web dijalankan otomatis
(`webServer`), dan server yang sudah berjalan akan dipakai ulang. Pastikan database
sudah dimigrasi dan di-seed sebelum menjalankan test.

Laporan HTML tersimpan di `playwright-report/`, artefak kegagalan di `test-results/`.

## Seed data

Jadwal diimpor dari `jadwal penggunaan lab 2026-2027 ganjil - Copy - Copy.xlsx`
(7 lab, 79 jadwal, 11 dosen). Seed juga membuat 12 mahasiswa, 474 enrollment,
161 item inventaris, contoh peminjaman, tiket kendala, dan periode rekrutmen.

```powershell
python prisma/parse_excel.py   # opsional, regenerasi data jadwal
node prisma/seed_full.js
```

## Catatan teknis

- Semua tanggal operasional dinormalisasi ke `Asia/Jakarta`; nilai `hari` disimpan
  sebagai tengah malam UTC yang mewakili tanggal kalender Jakarta.
- Autentikasi memakai JWT access/refresh di cookie httpOnly; middleware web
  melindungi rute berdasarkan peran, API memvalidasi ulang lewat guard.
- Persetujuan peminjaman berjalan dalam transaksi dan memeriksa konflik jadwal.
- Sistem desain: CSS kustom bertema petrol/amber, bukan template admin generik.

## Roadmap

| Fase | Status | Isi |
| --- | --- | --- |
| 0 — Fondasi | selesai | Monorepo, auth, peran, seed, deploy lokal |
| 1 — Correctness & keamanan | selesai | Zona waktu Jakarta, guard DB, rate limit, validasi unggahan, audit |
| 2 — Alur operasional | selesai | Persetujuan transaksional, QR sesi + enrollment, SLA kendala, laporan harian |
| 3 — UI/UX | selesai | Sistem desain petrol/amber, rail shell, timetable, mobile nav, PWA |
| 4 — QA | selesai | Playwright E2E desktop + mobile, build produksi, dokumentasi |

Lihat `C:\Users\ASUS\.opencode\plan\labops-audit-and-redesign-plan.md` untuk rencana lengkap.
