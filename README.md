# LabOps Ilkom ITG

Sistem operasional Laboratorium Ilmu Komputer, Institut Teknologi Garut.
Monorepo pnpm + Turborepo: Next.js (web) dan NestJS (API) dengan PostgreSQL/Prisma.

## Fitur

- **Jadwal lab** — peta lab × jam, filter per lab/hari/semester, pencegahan konflik sesi.
- **Peminjaman** — pengajuan, pengecekan slot otomatis, persetujuan koordinator, penolakan dengan alasan, pembatalan, penyelesaian. Pengajuan juga bisa dilakukan tanpa akun lewat halaman publik.
- **Kendala** — tiket bernomor, penanggung jawab, riwayat status, tenggat SLA per urgensi, lampiran foto. Pelaporan juga tersedia tanpa akun.
- **Absensi** — token QR per sesi (berlaku 15 menit), QR statis lab sebagai cadangan, peserta kelas terdaftar, rekap dan koreksi sebelum divalidasi KM.
- **Inventaris** — aset per lab, kondisi, mutasi antar-lab, keterkaitan dengan tiket kendala.
- **Rekrutmen** — periode, lamaran dengan berkas PDF, tahapan seleksi, keputusan otomatis menambah instruktur/asisten dosen ke mata kuliah.
- **Laporan & Prodi** — ringkasan status, laporan mingguan, dasbor pimpinan, dasbor prodi, ekspor CSV.
- **Notifikasi & audit** — notifikasi dalam aplikasi, jejak audit 100 aktivitas terakhir.
- **Halaman publik** — jadwal, pengajuan peminjaman, pelaporan kendala, dan rekrutmen terbuka untuk mahasiswa tanpa login.

## Struktur

- `apps/web` — Next.js App Router (port 3000)
- `apps/api` — NestJS (port 4000)
- `packages/shared` — skema Zod, enum, tipe
- `prisma` — schema, migrasi, seed
- `e2e` — pengujian Playwright

Enum dan tipe domain saat ini didefinisikan di Prisma schema dan dipakai
langsung oleh web maupun API. Paket `packages/shared` masih declaring
dependency Zod dan path alias di kedua app, tetapi belum dipakai sebagai
sumber kebenaran.

## Prasyarat

- Node.js 20+
- pnpm 9+
- PostgreSQL 18 di port 5433, DB `labops`, user `labops`

## PostgreSQL di mesin ini

Instalasi PostgreSQL bawaan Windows diblokir oleh kebijakan Application Control
(WDAC "Enterprise signing level"), sehingga `initdb` gagal saat memuat
`plpgsql.dll` dan `pg_ctl.exe` tak bisa dijalankan. Agar database tetap bisa
dipakai, cluster dibuat manual di luar `Program Files`:

- Binary: `D:\App\pgsql18\bin`
- Data directory: `D:\App\pgsql18\data`
- Port `5433`, superuser `labops` (password `labops`), database `labops`
- `share/extension/plpgsql.control` diganti versi stub tanpa `module_pathname`,
  sehingga `CREATE EXTENSION plpgsql` tak perlu memuat DLL yang diblokir.
  Konsekuensinya bahasa PL/pgSQL **tidak tersedia** di database ini; hal itu
  tidak dipakai oleh migrasi Prisma maupun query aplikasi.

Nyalakan server setelah restart Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-postgres.ps1
```

Matikan dengan `scripts/stop-postgres.ps1`.

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

### Seed data

`pnpm db:seed` menjalankan `prisma/seed_all.js`, yang mengurutkan seluruh tahapan:

1. `seed_full.js` — lab, dosen, jadwal, mahasiswa, enrollment, inventaris, peminjaman, kendala, rekrutmen
2. `backfill_mata_kuliah.js` — data MataKuliah yang diturunkan dari jadwal
3. `seed.prodi-periode.js` — prodi, periode akademik, akun kaprodi
4. `seed_personel.js` — 7 instruktur, 14 asisten dosen, dan penugasan ke mata kuliah

Tahap 2 wajib setelah tahap 1 (MataKuliah berasal dari Schedule), dan tahap 4
wajib setelah tahap 2 (penugasan personel menunjuk MataKuliah).

Jadwal diimpor dari `jadwal penggunaan lab 2026-2027 ganjil - Copy - Copy.xlsx`:

```powershell
python prisma/parse_excel.py   # opsional, regenerasi data jadwal
```

## Build produksi

```powershell
pnpm --filter @labops/api build
pnpm --filter @labops/web build
pnpm --filter @labops/api start
pnpm --filter @labops/web start
```

## Akun demo

Seluruh akun di bawah dibuat oleh `pnpm db:seed`.

| Peran | Email / username | Kata sandi |
| --- | --- | --- |
| Admin sistem | `admin@labops.local` | `admin123` |
| Koordinator lab | `koordinator@labops.local` | `koord123` |
| Pimpinan (LEADER) | `prodi@labops.local` | `prodi123` |
| Kaprodi TIF | `kaprodi-tif@labops.local` | `kaprodi123` |
| Kaprodi SIS | `kaprodi-sis@labops.local` | `kaprodi123` |
| Instruktur | `instruktur01`–`instruktur07` | `aditya123`, `rani123`, `bayu123`, `siti123`, `dimas123`, `nadia123`, `fajar123` |
| Dosen (contoh) | `drdedekurniadimkom@labops.local` | `dosen123` |
| Mahasiswa (contoh) | `mhs01@labops.local` | `mhs123` |

Dosen lain memakai pola `<slug nama>@labops.local` dengan kata sandi `dosen123`.
Mahasiswa `mhs01`–`mhs12` memakai `mhs123`. Asisten dosen memakai
`asisten01@labops.local`–`asisten14@labops.local` dengan kata sandi `asisten123`.

Login menerima email lengkap maupun username pendek tanpa domain
(mis. `instruktur01`), yangzulur menjadi `instruktur01@labops.local`.

## Peran

| Peran | Keterangan |
| --- | --- |
| `ADMIN_SYSTEM` | Admin sistem, akses penuh |
| `COORDINATOR` | Koordinator lab, 6 menu utama |
| `LEADER` | Pimpinan, monitoring laporan dan rekap absensi |
| `KAPRODI` | Kepala program studi, menu prodi miliknya |
| `INSTRUKTUR` | Pengajar praktikum, dasbor sendiri |
| `ASISTEN_DOSEN` | Assistantstructor, dasbor sendiri |
| `USER` | Dosen dan mahasiswa (dibedakan lewat `subRoles`) |

## Halaman web

| Rute | Akses | Isi |
| --- | --- | --- |
| `/` | publik | Landing + peta jadwal lab |
| `/login` | publik | Masuk, tombol akun demo |
| `/informasi/jadwal` | publik | Jadwal lab terbuka |
| `/informasi/peminjaman` | publik | Pengajuan peminjaman tanpa login |
| `/informasi/kendala` | publik | Pelaporan kendala tanpa login |
| `/informasi/rekrutmen` | publik | Lowongan & lamaran instruktur/asdos |
| `/dashboard` | admin, user,_leader | Papan kerja hari ini |
| `/koordinator` | admin, koordinator | Dasbor khusus koordinator |
| `/kaprodi` | admin, leader, kaprodi | Dasbor program studi |
| `/instruktur` | instruktur, asdos | Dasbor pengajar |
| `/schedules` | semua peran | Jadwal lab, filter, detail sesi |
| `/bookings` | admin, koordinator, user, leader | Pengajuan & persetujuan peminjaman |
| `/issues` | admin, koordinator, user, leader | Tiket kendala, triage, riwayat |
| `/attendance` | admin, user, leader, instruktur, asdos | Scan QR sesi, rekap |
| `/attendance/admin` | admin, leader | Statistik & rekap absensi |
| `/attendance/validate` | semua peran | Validasi absensi oleh KM kelas |
| `/inventory` | admin, koordinator, user, leader, instruktur, asdos | Aset, kondisi, mutasi |
| `/staff` | admin, koordinator, user, leader, instruktur, asdos | Instruktur & asisten dosen |
| `/recruitment` | semua peran | Periode & lamaran asisten |
| `/notifications` | semua peran | Daftar notifikasi |
| `/courses` | admin, koordinator | Manajemen mata kuliah & kelas |
| `/labs` | admin, koordinator | Manajemen lab & token QR |
| `/reports` | admin, leader | Laporan & analitik |
| `/prodi` | admin, leader, kaprodi | Rekap per program studi |
| `/audit` | admin | Jejak audit |
| `/users` | admin | Manajemen pengguna |

## Endpoint API

Guard `JwtAuthGuard` memvalidasi JWT lalu mengecek ulang status pengguna ke
database. `RolesGuard` + dekorator `@Roles(...)` membatasi akses per peran.
Endpoint di bawah `/public/*` tidak memakai guard.

### Auth
- `POST /auth/login` `{ email, password }`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

### Users
- `GET  /users?search=&role=&status=&page=&pageSize=`
- `GET  /users/:id`
- `POST /users` `{ nama, email, password, role?, subRoles? }`
- `PUT  /users/:id`
- `PATCH /users/:id/deactivate`
- `PATCH /users/:id/reset-password` `{ password }`
- `POST /users/import` `{ rows: [...] }`

### Prodi
- `GET  /prodi`
- `GET  /prodi/:id`
- `POST /prodi`
- `PUT  /prodi/:id`
- `DELETE /prodi/:id`
- `POST /prodi/:id/kaprodi`

### Periode
- `GET  /periode`
- `GET  /periode/:id`
- `POST /periode`
- `PUT  /periode/:id`
- `DELETE /periode/:id`
- `POST /periode/:id/current`

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

### Courses
- `GET  /courses`
- `GET  /courses/:id`
- `POST /courses`
- `POST /courses/personel` — tambah pengajar (dosen/instruktur/asdos)
- `PUT  /courses/:id`
- `DELETE /courses/:id`
- `POST /courses/:id/kelas`
- `PUT  /courses/:id/kelas/:scheduleId`
- `DELETE /courses/:id/kelas/:scheduleId`

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
- `GET  /attendance/team` — sesi & anggota tim pengajar
- `POST /attendance/team` — tandai kehadiran tim
- `POST /attendance/instruktur/session` — buat sesi absensi instruktur
- `PATCH /attendance/instruktur/sessions/:sesiId`
- `POST /attendance/instruktur/sessions/:sesiId/qr` — tampilkan ulang QR validasi
- `POST /attendance/validate` — pindai QR validasi KM
- `POST /attendance/validate/confirm`
- `GET  /attendance/recap/:sesiId`
- `GET  /attendance/enrollments/:sesiId`
- `POST /attendance/enrollments` `{ sesiId, userId }`
- `DELETE /attendance/enrollments/:id`
- `GET  /attendance/admin/stats`
- `GET  /attendance/admin/courses`
- `GET  /attendance/admin/courses/:courseId`
- `GET  /attendance/instruktur/courses`
- `GET  /attendance/instruktur/sessions`

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
- `GET  /inventory/:id`
- `POST /inventory`
- `PUT  /inventory/:id`
- `PATCH /inventory/:id/mutate` `{ labTujuanId }`
- `DELETE /inventory/:id`
- `POST /inventory/import`

### Reports
- `GET  /reports/today` — ringkasan operasional hari ini (Jakarta)
- `GET  /reports/dashboard`
- `GET  /reports/weekly?weekStart=&labId=&mataKuliah=`
- `GET  /reports/usage?from=&to=&labId=`

### Recruitment
- `GET  /recruitment/periods?status=`
- `GET  /recruitment/periods/:id`
- `POST /recruitment/periods` `{ posisi, tipe, mataKuliah, kuota, persyaratan, tenggat }`
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
- `POST /files/upload` (multipart field `file`; PNG/JPG/WEBP/PDF, maks 10 MB)
- `GET  /health`

### Endpoint publik (tanpa guard)
- `GET  /public/bookings/availability?labId=&tanggal=&jamMulai=&jamSelesai=`
- `POST /public/bookings` — pengajuan tanpa akun
- `GET  /public/bookings/status/:kode?email=` — cek status pengajuan
- `POST /public/issues` — laporan kendala tanpa akun
- `GET  /public/recruitment/periods`
- `POST /public/recruitment/applications` — lamaran tanpa akun
- `POST /public/files/upload` — unggah berkas lamaran

Berkas unggahan disajikan lewat `GET /uploads/:filename`.

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

## Catatan teknis

- Semua tanggal operasional dinormalisasi ke `Asia/Jakarta`; nilai `hari` disimpan
  sebagai tengah malam UTC yang mewakili tanggal kalender Jakarta. Utilitas
  bersama ada di `apps/api/src/common/time.ts`.
- Autentikasi memakai JWT access/refresh di cookie httpOnly; middleware web
  melindungi rute berdasarkan peran, API memvalidasi ulang lewat guard.
- Instruktur dan asisten dosen memakai `role` langsung, bukan sub-peran.
  Klasifikasi peran pengajar di modul absensi menyduh `role` lebih dulu dan
  memakai `subRoles` sebagai penanda akun lama.
- Persetujuan peminjaman berjalan dalam transaksi dan memeriksa konflik jadwal.
- Penyimpanan berkas memakai driver lokal (`./uploads`) dengan whitelist tipe
  MIME dan ekstensi.
- Sistem desain: CSS kustom bertema petrol/amber, bukan template admin generik.

## Roadmap

| Fase | Status | Isi |
| --- | --- | --- |
| 0 — Fondasi | selesai | Monorepo, auth, peran, seed, deploy lokal |
| 1 — Correctness & keamanan | selesai | Zona waktu Jakarta, guard DB, rate limit, validasi unggahan, audit |
| 2 — Alur operasional | selesai | Persetujuan transaksional, QR sesi + enrollment, SLA kendala, laporan harian |
| 3 — UI/UX | selesai | Sistem desain petrol/amber, rail shell, timetable, mobile nav, PWA |
| 4 — QA | selesai | Playwright E2E desktop + mobile, build produksi, dokumentasi |
| 5 — Prodi & periode | selesai | Role kaprodi, prodi, periode akademik, filter per periode |
