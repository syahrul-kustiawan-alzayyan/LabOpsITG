# LabOps Ilkom ITG

Monorepo (pnpm + Turborepo) - aplikasi manajemen operasional lab.

## Struktur

- `apps/web` - Next.js (port 3000)
- `apps/api` - NestJS (port 4000)
- `packages/shared` - skema Zod, enum, tipe
- `prisma` - schema, migrasi, seed

## Prasyarat

- Node.js 20+
- pnpm 9+
- PostgreSQL 18 di port 5433, DB `labops`, user `labops`

## Menjalankan (dev)

```powershell
pnpm install
pnpm db:migrate
pnpm db:seed
# terminal 1
cd apps/api; npm run dev
# terminal 2
cd apps/web; npm run dev
```

Buka http://localhost:3000

## Akun demo

- admin@labops.local / admin123 (Admin Sistem)
- koordinator@labops.local / koord123 (Koordinator Lab)

## Halaman Web

- / - redirect ke /login
- /login - masuk
- /dashboard - dasbor (peran + tautan manajemen)
- /users - manajemen user (admin)
- /labs - manajemen lab (admin)
- /schedules - jadwal lab (admin/koordinator)
- /bookings - peminjaman lab (semua user)
- /staff - instruktur & asisten dosen (admin/koordinator)
- /prodi - dasbor prodi (pimpinan)

## Endpoint

Auth:
- POST /auth/login  { email, password }
- POST /auth/refresh
- POST /auth/logout
- GET  /auth/me

Users:
- GET  /users
- POST /users  { nama, email, password, role?, subRoles? }
- PUT  /users/:id
- PATCH /users/:id/deactivate
- PATCH /users/:id/reset-password  { password }
- POST /users/import  { rows: [...] }

Labs:
- GET  /labs
- POST /labs  { kode, nama, kapasitas, lokasi }
- PUT  /labs/:id
- PATCH /labs/:id/regenerate-qr
- DELETE /labs/:id

Schedules:
- GET  /schedules?labId=&pengampuId=&hari=&semester=
- POST /schedules  { labId, mataKuliah, kelas, hari, jamMulai, jamSelesai, tanggalMulai, tanggalSelesai, semester, ... }
- PUT  /schedules/:id
- DELETE /schedules/:id
- POST /schedules/:id/duplicate  { tanggalMulai, tanggalSelesai, semester? }
- POST /schedules/import  { rows: [...] }

Bookings:
- GET  /bookings?status=&labId=&peminjamId=&from=&to=
- POST /bookings  { labId, tanggal, jamMulai, jamSelesai, keperluan, ... }
- PATCH /bookings/:id/approve
- PATCH /bookings/:id/reject  { alasan }
- PATCH /bookings/:id/cancel
- PATCH /bookings/:id/complete

Notifications:
- GET  /notifications
- GET  /notifications/unread-count
- PATCH /notifications/:id/read

Audit:
- GET  /audit-logs

Health:
- GET  /health

Issues:
- GET  /issues?status=&labId=&urgensi=
- POST /issues  { labId, kategori, urgensi, deskripsi, itemId?, fotoUrls? }
- PATCH /issues/:id/verify  { penanggungJawabId, catatan? }
- PATCH /issues/:id/status  { status, catatan? }
- PATCH /issues/:id/reopen  { catatan? }

Inventory:
- GET  /inventory?labId=&kondisi=&kategori=
- GET  /inventory/summary
- POST /inventory  { kodeAset, nama, kategori, labId, kondisi?, tanggalPerolehan?, catatan? }
- PUT  /inventory/:id
- PATCH /inventory/:id/mutate  { labTujuanId }
- DELETE /inventory/:id
- POST /inventory/import  { rows: [...] }

Reports:
- GET /reports/dashboard
- GET /reports/weekly?weekStart=&labId=&mataKuliah=
- GET /reports/usage?from=&to=&labId=

Recruitment:
- GET  /recruitment/periods?status=
- POST /recruitment/periods  { posisi, mataKuliah, kuota, persyaratan, tenggat }
- PATCH /recruitment/periods/:id
- PATCH /recruitment/periods/:id/close
- GET  /recruitment/applications?periodId=&status=
- GET  /recruitment/applications/mine
- POST /recruitment/applications  { periodId, mataKuliahDilamar, motivasi, nilai, ketersediaan, cvUrl?, transkripUrl? }
- PATCH /recruitment/applications/:id/status  { status, catatan? }
- PATCH /recruitment/applications/:id/interview  { tanggal }

Attendance:
- POST /attendance/scan  { qrToken }
- POST /attendance/manual  { sesiId, userId, status, reason }
- POST /attendance/request-correction  { sesiId, reason }
- GET  /attendance?sesiId=&userId=&labId=&from=&to=
- GET  /attendance/recap/:sesiId

Files:
- POST /files/upload (multipart field "file")
- Static: GET /uploads/:filename

## Akun demo

- admin@labops.local / admin123 (Admin Sistem)
- koordinator@labops.local / koord123 (Koordinator Lab)
- Dosen: email = <slug nama>@labops.local / dosen123 (11 dosen dari jadwal Excel)

## Seed data

Data jadwal diimpor dari `jadwal penggunaan lab 2026-2027 ganjil - Copy - Copy.xlsx`
(7 lab, 79 jadwal, 11 dosen). Untuk regenerate: `python prisma/parse_excel.py` lalu `node prisma/seed_full.js`.

## Rencana

Lihat C:\Users\ASUS\.opencode\plan\labops-development-plan.md
