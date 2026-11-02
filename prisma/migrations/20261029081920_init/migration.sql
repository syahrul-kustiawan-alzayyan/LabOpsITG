-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'COORDINATOR', 'LEADER', 'ADMIN_SYSTEM');

-- CreateEnum
CREATE TYPE "SubRole" AS ENUM ('DOSEN', 'MAHASISWA', 'INSTRUKTUR', 'ASISTEN_DOSEN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LabStatus" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('PRAKTIKUM_RUTIN', 'KEGIATAN_KHUSUS');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('AKTIF', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('PERANGKAT', 'JARINGAN', 'LISTRIK', 'PERANGKAT_LUNAK', 'FASILITAS', 'LAINNYA');

-- CreateEnum
CREATE TYPE "IssueUrgency" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('BARU', 'DIVERIFIKASI', 'DALAM_PENANGANAN', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'TIDAK_HADIR');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('BAIK', 'PERLU_PERAWATAN', 'RUSAK', 'DIHAPUSKAN');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('PC', 'JARINGAN', 'PERIFERAL', 'PERANGKAT_PENDUKUNG');

-- CreateEnum
CREATE TYPE "RecruitmentStatus" AS ENUM ('DIBUKA', 'DITUTUP');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DIAJUKAN', 'DIPROSES', 'WAWANCARA', 'DITERIMA', 'DITOLAK', 'CADANGAN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "subRoles" "SubRole"[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kapasitas" INTEGER NOT NULL,
    "lokasi" TEXT NOT NULL,
    "status" "LabStatus" NOT NULL DEFAULT 'AKTIF',
    "qrToken" TEXT NOT NULL,
    "qrVersion" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "mataKuliah" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "pengampuId" TEXT,
    "hari" INTEGER NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "semester" TEXT NOT NULL,
    "jenis" "ScheduleType" NOT NULL DEFAULT 'PRAKTIKUM_RUTIN',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'AKTIF',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "peminjamId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "keperluan" TEXT NOT NULL,
    "jumlahPeserta" INTEGER,
    "kebutuhanKhusus" TEXT,
    "lampiranUrl" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "pemrosesId" TEXT,
    "alasanKeputusan" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "nomorTiket" TEXT NOT NULL,
    "pelaporId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "itemId" TEXT,
    "kategori" "IssueCategory" NOT NULL,
    "urgensi" "IssueUrgency" NOT NULL DEFAULT 'SEDANG',
    "deskripsi" TEXT NOT NULL,
    "fotoUrls" TEXT[],
    "status" "IssueStatus" NOT NULL DEFAULT 'BARU',
    "penanggungJawabId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL,
    "catatan" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sesiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AttendanceStatus" NOT NULL,
    "qrTokenScanned" TEXT NOT NULL,
    "correctedBy" TEXT,
    "correctionReason" TEXT,
    "oldValue" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "kodeAset" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "InventoryCategory" NOT NULL,
    "labId" TEXT NOT NULL,
    "kondisi" "InventoryCondition" NOT NULL DEFAULT 'BAIK',
    "tanggalPerolehan" TIMESTAMP(3),
    "catatan" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMutation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "labAsalId" TEXT NOT NULL,
    "labTujuanId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "InventoryMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentPeriod" (
    "id" TEXT NOT NULL,
    "posisi" TEXT NOT NULL,
    "mataKuliah" TEXT NOT NULL,
    "kuota" INTEGER NOT NULL,
    "persyaratan" TEXT,
    "tenggat" TIMESTAMP(3) NOT NULL,
    "status" "RecruitmentStatus" NOT NULL DEFAULT 'DIBUKA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "pelamarId" TEXT NOT NULL,
    "mataKuliahDilamar" TEXT NOT NULL,
    "motivasi" TEXT,
    "nilai" DOUBLE PRECISION,
    "ketersediaan" TEXT,
    "cvUrl" TEXT,
    "transkripUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "catatanPenilaian" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_kode_key" ON "Lab"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_qrToken_key" ON "Lab"("qrToken");

-- CreateIndex
CREATE INDEX "Schedule_labId_hari_jamMulai_idx" ON "Schedule"("labId", "hari", "jamMulai");

-- CreateIndex
CREATE INDEX "Booking_labId_tanggal_jamMulai_idx" ON "Booking"("labId", "tanggal", "jamMulai");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_nomorTiket_key" ON "Issue"("nomorTiket");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sesiId_userId_key" ON "Attendance"("sesiId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_kodeAset_key" ON "InventoryItem"("kodeAset");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_pengampuId_fkey" FOREIGN KEY ("pengampuId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_peminjamId_fkey" FOREIGN KEY ("peminjamId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pemrosesId_fkey" FOREIGN KEY ("pemrosesId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_penanggungJawabId_fkey" FOREIGN KEY ("penanggungJawabId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueHistory" ADD CONSTRAINT "IssueHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sesiId_fkey" FOREIGN KEY ("sesiId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMutation" ADD CONSTRAINT "InventoryMutation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "RecruitmentPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_pelamarId_fkey" FOREIGN KEY ("pelamarId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
