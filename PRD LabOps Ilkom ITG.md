# PRD — LabOps Ilkom ITG

**Sistem Manajemen Operasional Laboratorium Ilmu Komputer**

Versi 1.0 (Draf) · Status: Untuk ditinjau

> Catatan: Diagram use case yang diberikan terpotong di sisi kiri dan kanan, sehingga nama aktor tidak terlihat penuh. Nama aktor pada dokumen ini disimpulkan dari fungsi yang terhubung dan ditandai sebagai **asumsi** (lihat bagian 12). Mohon dikoreksi bila berbeda.

## 1. Ringkasan Produk

LabOps Ilkom ITG adalah aplikasi web terpusat untuk mengelola operasional laboratorium Program Studi Ilmu Komputer: penjadwalan penggunaan lab, peminjaman lab, pelaporan kendala, rekrutmen instruktur/asisten dosen, absensi, dan inventaris. Sistem menggantikan proses manual (chat, spreadsheet, formulir kertas) dengan satu alur kerja yang tercatat, dapat dilacak, dan dapat dilaporkan.

## 2. Latar Belakang dan Masalah

Pengelolaan lab saat ini umumnya menghadapi masalah berikut:

- Jadwal praktikum tersebar di banyak file sehingga rawan bentrok dan sulit diperbarui.
- Peminjaman lab di luar jadwal praktikum diajukan lewat pesan pribadi, tanpa status yang jelas.
- Kendala fasilitas (PC rusak, jaringan mati, AC, proyektor) dilaporkan secara informal dan sering tidak tertangani.
- Rekrutmen instruktur dan asisten dosen tidak terstandar.
- Absensi praktikum tidak terekam rapi sehingga laporan mingguan harus disusun manual.
- Data inventaris tidak terhubung dengan laporan kendala.

## 3. Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik | Target |
| --- | --- | --- |
| Menghilangkan bentrok jadwal | Jumlah bentrok jadwal per semester | 0 |
| Mempercepat proses peminjaman | Rata-rata waktu dari pengajuan sampai keputusan | ≤ 2 hari kerja |
| Meningkatkan penanganan kendala | Persentase kendala berstatus selesai dalam 7 hari | ≥ 80% |
| Mempermudah pelaporan | Waktu penyusunan laporan mingguan | Turun ≥ 70% |
| Akurasi kehadiran | Persentase sesi praktikum dengan absensi terekam | ≥ 95% |
| Adopsi | Pengguna aktif per bulan dibanding pengguna terdaftar | ≥ 80% |

## 4. Ruang Lingkup

**Dalam lingkup (v1.0)**

- Manajemen pengguna dan peran
- Penjadwalan lab dan tampilan jadwal
- Pengajuan dan persetujuan peminjaman lab
- Pelaporan dan penanganan kendala lab
- Lamaran dan seleksi Instruktur/Asisten Dosen
- Absensi dan rekap absensi
- Manajemen inventaris
- Laporan dan dasbor untuk pimpinan

**Di luar lingkup (v1.0)**

- Penilaian praktikum dan nilai mahasiswa
- Integrasi penuh dengan SIAKAD (hanya impor data dasar, bila tersedia)
- Pembayaran atau penagihan
- Aplikasi mobile native (v1 berupa web responsif)

## 5. Aktor dan Persona

| Aktor | Deskripsi | Use case terkait |
| --- | --- | --- |
| **Pengguna Lab** (asumsi: Dosen, Mahasiswa, Instruktur, Asisten Dosen) | Pihak yang memakai lab dan layanannya | Lihat Jadwal, Pengajuan Peminjaman Lab, Laporan Kendala Lab, Lamaran Instruktur/Asisten Dosen, Absensi |
| **Koordinator Lab** (asumsi: aktor berawalan "K" di sisi kanan atas) | Pengelola utama operasional lab, memiliki hak administrasi | Manage User, Tambah Jadwal, Manage Peminjaman Lab, Manage Kendala Lab, Manage Lamaran, Manage Absensi, Manage Inventaris |
| **Pimpinan** (asumsi: Kaprodi / Kepala Lab / Dekanat) | Pemantau yang hanya melihat laporan | View Laporan, View Absensi |

### Persona ringkas

- **Koordinator Lab**: perlu satu tempat untuk menyusun jadwal, memutuskan peminjaman, memantau kendala, dan menyusun laporan mingguan tanpa menyalin data manual.
- **Asisten Dosen / Instruktur**: perlu melihat jadwal mengajar, melakukan absensi, dan melaporkan kendala dengan cepat.
- **Dosen / Mahasiswa**: perlu tahu lab mana kosong, mengajukan peminjaman, dan mengetahui statusnya.
- **Pimpinan**: perlu ringkasan penggunaan lab, kehadiran, dan kendala tanpa harus meminta laporan.

## 6. Ringkasan Use Case

| Kode | Use case | Aktor | Prioritas |
| --- | --- | --- | --- |
| UC-01 | Lihat Jadwal | Pengguna Lab | Must |
| UC-02 | Pengajuan Peminjaman Lab | Pengguna Lab | Must |
| UC-03 | Laporan Kendala Lab | Pengguna Lab | Must |
| UC-04 | Lamaran Instruktur / Asisten Dosen | Pengguna Lab | Should |
| UC-05 | Absensi | Pengguna Lab | Must |
| UC-06 | Manage User | Koordinator Lab | Must |
| UC-07 | Tambah Jadwal | Koordinator Lab | Must |
| UC-08 | Manage Peminjaman Lab | Koordinator Lab | Must |
| UC-09 | Manage Kendala Lab | Koordinator Lab | Must |
| UC-10 | Manage Lamaran | Koordinator Lab | Should |
| UC-11 | Manage Absensi | Koordinator Lab | Must |
| UC-12 | Manage Inventaris | Koordinator Lab | Should |
| UC-13 | View Laporan | Pimpinan | Must |
| UC-14 | View Absensi | Pimpinan | Should |

Prioritas memakai skema MoSCoW. Seluruh use case "Must" masuk rilis pertama.

## 7. Kebutuhan Fungsional

### 7.1 Autentikasi dan Manajemen User (UC-06)

- **FR-01** Pengguna masuk dengan email institusi dan kata sandi. Opsi login SSO institusi bila tersedia.
- **FR-02** Koordinator Lab dapat menambah, mengubah, menonaktifkan, dan mengatur ulang kata sandi pengguna.
- **FR-03** Koordinator Lab dapat menetapkan peran (Pengguna Lab, Koordinator Lab, Pimpinan) dan sub-peran (Dosen, Mahasiswa, Instruktur, Asisten Dosen).
- **FR-04** Impor pengguna massal lewat CSV dengan validasi dan laporan kesalahan per baris.
- **FR-05** Akun yang dinonaktifkan tidak dapat login, namun riwayatnya tetap tersimpan.

**Kriteria penerimaan**

- Email tidak boleh duplikat.
- Setiap perubahan peran tercatat di log audit (siapa, kapan, apa).

### 7.2 Jadwal Lab (UC-01, UC-07)

- **FR-06** Koordinator Lab menambah jadwal: lab, mata kuliah/kegiatan, kelas, pengampu, hari, jam mulai, jam selesai, periode semester, dan jenis (praktikum rutin / kegiatan khusus).
- **FR-07** Sistem menolak jadwal yang bentrok pada lab dan jam yang sama, dan menampilkan jadwal yang berbenturan.
- **FR-08** Jadwal dapat diubah, dibatalkan, atau diduplikasi ke minggu/semester lain. Perubahan memicu notifikasi ke pihak terkait.
- **FR-09** Pengguna Lab melihat jadwal dalam tampilan kalender (mingguan/harian) dan tabel, dengan filter lab, mata kuliah, pengampu, dan tanggal.
- **FR-10** Tampilan jadwal menandai slot kosong, terpakai praktikum, dan terpakai peminjaman.
- **FR-11** Impor jadwal massal lewat CSV/Excel.
- **FR-12** Jadwal dapat diekspor ke PDF dan iCal.

**Kriteria penerimaan**

- Pembuatan jadwal bentrok selalu ditolak, termasuk dengan peminjaman yang sudah disetujui.
- Halaman jadwal termuat dalam ≤ 3 detik untuk data satu semester.

### 7.3 Peminjaman Lab (UC-02, UC-08)

- **FR-13** Pengguna mengajukan peminjaman: lab, tanggal, jam mulai-selesai, keperluan, jumlah peserta, kebutuhan khusus, dan lampiran surat (opsional).
- **FR-14** Sistem memeriksa ketersediaan lab secara langsung dan menolak pengajuan pada slot yang sudah terisi.
- **FR-15** Status pengajuan: Diajukan, Disetujui, Ditolak, Dibatalkan, Selesai.
- **FR-16** Koordinator Lab menyetujui atau menolak, dengan alasan wajib saat menolak. Persetujuan otomatis memblokir slot di jadwal.
- **FR-17** Pengguna dapat membatalkan pengajuan sebelum waktu pakai, dan melihat riwayat serta status.
- **FR-18** Koordinator Lab dapat membuat peminjaman atas nama pengguna dan menutup lab untuk keperluan tertentu.
- **FR-19** Notifikasi dikirim pada setiap perubahan status.

**Kriteria penerimaan**

- Dua pengajuan pada slot yang sama: hanya satu yang dapat disetujui.
- Pengajuan yang tidak diproses sampai H-1 memunculkan pengingat kepada Koordinator Lab.

### 7.4 Kendala Lab (UC-03, UC-09)

- **FR-20** Pengguna melaporkan kendala: lab, kategori (perangkat, jaringan, listrik, perangkat lunak, fasilitas, lainnya), item inventaris terkait (opsional), deskripsi, tingkat urgensi, dan foto.
- **FR-21** Setiap laporan memiliki nomor tiket dan status: Baru, Diverifikasi, Dalam Penanganan, Selesai, Ditolak.
- **FR-22** Koordinator Lab memverifikasi, menetapkan penanggung jawab, mengubah status, dan menambah catatan penanganan.
- **FR-23** Pelapor dapat memantau status dan menerima notifikasi setiap perubahan.
- **FR-24** Kendala yang terhubung ke item inventaris otomatis mengubah kondisi item (mis. Rusak) dan mencatat riwayatnya.
- **FR-25** Kendala berurgensi tinggi menandai lab terdampak pada tampilan jadwal.
- **FR-26** Pelapor dapat memberi konfirmasi atau membuka kembali tiket setelah berstatus Selesai.

**Kriteria penerimaan**

- Tiket tidak dapat dihapus, hanya diubah statusnya.
- Waktu setiap perubahan status tersimpan untuk perhitungan waktu penanganan.

### 7.5 Lamaran Instruktur / Asisten Dosen (UC-04, UC-10)

- **FR-27** Koordinator Lab membuka dan menutup periode rekrutmen berisi posisi, mata kuliah/lab, kuota, persyaratan, dan tenggat.
- **FR-28** Pelamar mengisi lamaran: data diri, mata kuliah yang dilamar, motivasi, nilai mata kuliah terkait, ketersediaan waktu, dan unggahan CV/transkrip.
- **FR-29** Pelamar tidak dapat melamar ganda pada posisi yang sama dalam satu periode.
- **FR-30** Status lamaran: Diajukan, Diproses, Wawancara, Diterima, Ditolak, Cadangan.
- **FR-31** Koordinator Lab menyaring, memberi catatan penilaian, menjadwalkan wawancara, dan memutuskan hasil.
- **FR-32** Pelamar yang diterima otomatis mendapat peran Asisten Dosen/Instruktur dan dapat ditautkan ke jadwal mengajarnya.
- **FR-33** Ekspor daftar pelamar ke Excel/CSV.

### 7.6 Absensi (UC-05, UC-11, UC-14)

- **FR-34** Absensi dilakukan dengan memindai (scan) QR code yang tersedia di masing-masing laboratorium, pada sesi jadwal yang sedang berlangsung. Sistem mencocokkan QR yang dipindai dengan lab pada jadwal sesi dan pengguna yang login.
- **FR-35** Sistem menyimpan waktu absensi dan status Hadir, Terlambat (melebihi batas toleransi yang dapat diatur), Izin, Sakit, atau Tidak Hadir.
- **FR-36** Absensi hanya dapat dilakukan pada jendela waktu sesi. Di luar itu pengguna mengajukan koreksi.
- **FR-37** QR code dibuat oleh Koordinator Lab melalui sistem: satu QR code per laboratorium, dapat dicetak untuk dipasang di lab, dan dapat dibuat ulang (regenerate) bila perlu; QR lama otomatis tidak berlaku setelah dibuat ulang.
- **FR-38** Koordinator Lab melihat, mengoreksi, dan memvalidasi absensi, serta menandai kehadiran manual dengan alasan yang tercatat.
- **FR-39** Rekap absensi per sesi, per pengguna, per lab, dan per periode, dapat diekspor ke Excel/PDF.
- **FR-40** Pimpinan melihat rekap absensi dalam mode baca saja.

**Kriteria penerimaan**

- Satu pengguna hanya dapat memiliki satu catatan absensi per sesi. Scan pada QR lab yang tidak sesuai dengan lab pada sesi ditolak dengan pesan yang jelas.
- Setiap koreksi manual menyimpan nilai lama, nilai baru, pelaku, dan alasan.

### 7.7 Inventaris (UC-12)

- **FR-41** Koordinator Lab mengelola item: kode aset, nama, kategori (PC, jaringan, periferal, perangkat pendukung), lab penempatan, kondisi, tanggal perolehan, dan catatan.
- **FR-42** Kondisi item: Baik, Perlu Perawatan, Rusak, Dihapuskan.
- **FR-43** Perpindahan item antar lab tercatat sebagai riwayat mutasi.
- **FR-44** Item terhubung ke tiket kendala dan menampilkan riwayat perbaikan.
- **FR-45** Impor/ekspor inventaris lewat CSV/Excel dan pencetakan label QR aset.
- **FR-46** Ringkasan jumlah item per lab dan per kondisi.

### 7.8 Laporan dan Dasbor (UC-13)

- **FR-47** Pimpinan dan Koordinator Lab melihat dasbor: tingkat penggunaan lab, peminjaman (jumlah dan status), kendala (jumlah, status, waktu penanganan), kehadiran, dan kondisi inventaris.
- **FR-48** **Laporan mingguan pelaksanaan praktikum** dibuat otomatis dari data jadwal dan absensi: sesi terjadwal vs terlaksana, kehadiran, sesi batal, kendala selama pekan itu.
- **FR-49** Laporan dapat difilter periode, lab, dan mata kuliah, serta diekspor ke PDF dan Excel.
- **FR-50** Pimpinan hanya memiliki akses baca; tidak dapat mengubah data.

### 7.9 Notifikasi dan Log Audit (lintas fungsi)

- **FR-51** Notifikasi dalam aplikasi dan email untuk: perubahan status peminjaman, kendala, lamaran, perubahan jadwal, dan pengingat sesi.
- **FR-52** Log audit mencatat aksi penting (login, perubahan peran, persetujuan, koreksi absensi, perubahan jadwal) dan hanya dapat dibaca Koordinator Lab.

## 8. Matriks Hak Akses

| Fitur | Pengguna Lab | Koordinator Lab | Pimpinan |
| --- | --- | --- | --- |
| Lihat jadwal | ✔ | ✔ | ✔ |
| Tambah/ubah jadwal | — | ✔ | — |
| Ajukan peminjaman | ✔ | ✔ | — |
| Setujui/tolak peminjaman | — | ✔ | — |
| Lapor kendala | ✔ | ✔ | — |
| Kelola kendala | — | ✔ | — |
| Kirim lamaran | ✔ | — | — |
| Kelola lamaran | — | ✔ | — |
| Absensi | ✔ | ✔ | — |
| Kelola absensi | — | ✔ | — |
| Lihat absensi | Milik sendiri | Semua | Semua |
| Kelola inventaris | — | ✔ | — |
| Kelola user | — | ✔ | — |
| Lihat laporan | Terbatas | ✔ | ✔ |

## 9. Alur Pengguna Utama

**Alur 1 — Peminjaman lab**

1. Pengguna membuka jadwal dan memilih slot kosong.
2. Pengguna mengisi formulir pengajuan dan mengirim.
3. Sistem memeriksa ketersediaan, lalu menetapkan status Diajukan dan memberi tahu Koordinator Lab.
4. Koordinator Lab menyetujui atau menolak (dengan alasan).
5. Bila disetujui, slot terblokir di jadwal dan pengguna mendapat notifikasi.

**Alur 2 — Penanganan kendala**

1. Pengguna melaporkan kendala (dengan foto dan item inventaris).
2. Koordinator Lab memverifikasi dan menetapkan penanggung jawab.
3. Penanggung jawab menangani dan memperbarui status.
4. Kondisi inventaris diperbarui, pelapor mengonfirmasi, tiket ditutup.

**Alur 3 — Absensi dan laporan mingguan**

1. Sesi praktikum dimulai sesuai jadwal.
2. Peserta dan pengampu memindai QR code di lab pada jendela waktu sesi.
3. Koordinator Lab memvalidasi dan mengoreksi bila perlu.
4. Sistem menyusun laporan mingguan otomatis; Pimpinan melihatnya di dasbor.

**Alur 4 — Rekrutmen asisten**

1. Koordinator Lab membuka periode rekrutmen.
2. Pelamar mengirim lamaran dan dokumen.
3. Koordinator Lab menyaring, mewawancarai, dan memutuskan.
4. Pelamar diterima mendapat peran dan penugasan jadwal.

## 10. Model Data Tingkat Tinggi

- **User** (id, nama, email, peran, sub-peran, status)
- **Lab** (id, kode, nama, kapasitas, lokasi, status, token QR absensi)
- **Jadwal** (id, lab, mata kuliah, kelas, pengampu, hari/tanggal, jam mulai, jam selesai, semester, jenis, status)
- **Peminjaman** (id, peminjam, lab, tanggal, jam, keperluan, status, pemroses, alasan keputusan)
- **Kendala** (id, nomor tiket, pelapor, lab, item inventaris, kategori, urgensi, deskripsi, lampiran, status, penanggung jawab)
- **RiwayatKendala** (id, kendala, status, catatan, waktu, pelaku)
- **PeriodeRekrutmen** (id, posisi, mata kuliah, kuota, tenggat, status)
- **Lamaran** (id, periode, pelamar, dokumen, status, catatan penilaian)
- **Absensi** (id, jadwal/sesi, user, waktu scan, status, token QR yang dipindai, dikoreksi oleh)
- **Inventaris** (id, kode aset, nama, kategori, lab, kondisi, tanggal perolehan)
- **MutasiInventaris** (id, item, lab asal, lab tujuan, tanggal, pelaku)
- **Notifikasi** (id, penerima, jenis, isi, status baca)
- **LogAudit** (id, pelaku, aksi, objek, nilai lama, nilai baru, waktu)

Relasi utama: Lab 1–N Jadwal, Lab 1–N Inventaris, Jadwal 1–N Absensi, Inventaris 1–N Kendala, PeriodeRekrutmen 1–N Lamaran, User 1–N Peminjaman/Kendala/Lamaran/Absensi.

## 11. Kebutuhan Non-Fungsional

- **Kinerja**: halaman utama ≤ 3 detik; mendukung minimal 500 pengguna terdaftar dan 100 pengguna bersamaan.
- **Ketersediaan**: ≥ 99% pada jam operasional kampus; cadangan data harian.
- **Keamanan**: kata sandi di-hash, HTTPS wajib, kontrol akses berbasis peran, perlindungan terhadap CSRF/XSS/SQL injection, sesi kedaluwarsa otomatis.
- **Privasi**: data pribadi (CV, transkrip) hanya dapat dilihat Koordinator Lab dan pemilik data.
- **Kegunaan**: responsif untuk ponsel (absensi dan lapor kendala sering dilakukan dari ponsel), bahasa antarmuka Indonesia.
- **Keandalan data**: transaksi atomik untuk persetujuan peminjaman dan pembuatan jadwal agar tidak terjadi bentrok akibat akses bersamaan.
- **Auditabilitas**: seluruh aksi kritis tercatat dan tidak dapat diubah.
- **Pemeliharaan**: dokumentasi API, pengujian otomatis untuk aturan bentrok jadwal dan absensi.
- **Kompatibilitas**: peramban modern (Chrome, Edge, Firefox, Safari) dua versi terakhir.

## 12. Asumsi, Risiko, dan Pertanyaan Terbuka

**Asumsi**

- Aktor sisi kiri adalah Pengguna Lab (Dosen, Mahasiswa, Instruktur, Asisten Dosen), aktor kanan atas adalah Koordinator Lab, dan aktor kanan bawah adalah Pimpinan.
- Satu peran "Pengguna Lab" dapat memiliki beberapa sub-peran dengan hak berbeda pada absensi dan lamaran.
- Absensi dilakukan per sesi jadwal, bukan per hari, dengan memindai QR code lab yang dibuat Koordinator Lab.

**Risiko**

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Data jadwal awal tidak rapi | Impor gagal, bentrok tersembunyi | Template impor dan validasi, pembersihan data sebelum go-live |
| Absensi dimanipulasi (titip absen) | Laporan tidak akurat | QR code per lab yang dapat dibuat ulang oleh Koordinator Lab, jendela waktu sesi, pencocokan lab dengan jadwal, koreksi tercatat |
| Rendahnya adopsi | Proses manual tetap berjalan | Pelatihan singkat, masa transisi, dukungan dari pimpinan |
| Koordinator Lab menjadi hambatan persetujuan | Antrean peminjaman | Pengingat otomatis dan opsi delegasi persetujuan |

**Pertanyaan terbuka**

1. Siapa tepatnya aktor pada sisi kiri dan kanan bawah diagram?
2. Apakah perlu pembedaan Admin Sistem dan Koordinator Lab?
3. Apakah Dosen/Pimpinan perlu menyetujui peminjaman bertahap?
4. Apakah QR code lab bersifat tetap, atau perlu diganti berkala (mis. per pekan) untuk mencegah titip absen lewat foto QR?
5. Apakah ada sistem kampus (SIAKAD/SSO) yang harus diintegrasikan?
6. Apakah laporan mingguan memiliki format baku yang harus dipatuhi?

## 13. Rencana Rilis

| Fase | Cakupan | Estimasi |
| --- | --- | --- |
| **MVP (Fase 1)** | Autentikasi, Manage User, Jadwal (tambah dan lihat), Peminjaman, Kendala | 6–8 minggu |
| **Fase 2** | Absensi, Manage Absensi, View Absensi, Laporan dan dasbor | 4–6 minggu |
| **Fase 3** | Lamaran Instruktur/Asisten Dosen, Inventaris, notifikasi email, ekspor lanjutan | 4–6 minggu |
| **Pasca-rilis** | Integrasi SIAKAD/SSO, aplikasi mobile, analitik lanjutan | Menyusul |

Estimasi bersifat indikatif dan perlu divalidasi bersama tim pengembang.

## 14. Kriteria Penerimaan Rilis

- Seluruh use case berprioritas Must berfungsi sesuai kriteria penerimaan.
- Tidak ada cacat tingkat kritis atau tinggi yang terbuka.
- Data jadwal satu semester berhasil diimpor tanpa bentrok.
- Uji penerimaan pengguna (UAT) disetujui oleh Koordinator Lab dan perwakilan Pimpinan.
- Pelatihan pengguna dan panduan penggunaan tersedia.
