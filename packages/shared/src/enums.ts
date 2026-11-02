export const Role = {
  USER: "USER",
  COORDINATOR: "COORDINATOR",
  LEADER: "LEADER",
  ADMIN_SYSTEM: "ADMIN_SYSTEM",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const SubRole = {
  DOSEN: "DOSEN",
  MAHASISWA: "MAHASISWA",
  INSTRUKTUR: "INSTRUKTUR",
  ASISTEN_DOSEN: "ASISTEN_DOSEN",
} as const;
export type SubRole = (typeof SubRole)[keyof typeof SubRole];

export const BookingStatus = {
  DIAJUKAN: "DIAJUKAN",
  DISETUJUI: "DISETUJUI",
  DITOLAK: "DITOLAK",
  DIBATALKAN: "DIBATALKAN",
  SELESAI: "SELESAI",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const IssueStatus = {
  BARU: "BARU",
  DIVERIFIKASI: "DIVERIFIKASI",
  DALAM_PENANGANAN: "DALAM_PENANGANAN",
  SELESAI: "SELESAI",
  DITOLAK: "DITOLAK",
} as const;
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus];

export const IssueCategory = {
  PERANGKAT: "PERANGKAT",
  JARINGAN: "JARINGAN",
  LISTRIK: "LISTRIK",
  PERANGKAT_LUNAK: "PERANGKAT_LUNAK",
  FASILITAS: "FASILITAS",
  LAINNYA: "LAINNYA",
} as const;
export type IssueCategory = (typeof IssueCategory)[keyof typeof IssueCategory];

export const AttendanceStatus = {
  HADIR: "HADIR",
  TERLAMBAT: "TERLAMBAT",
  IZIN: "IZIN",
  SAKIT: "SAKIT",
  TIDAK_HADIR: "TIDAK_HADIR",
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const InventoryCondition = {
  BAIK: "BAIK",
  PERLU_PERAWATAN: "PERLU_PERAWATAN",
  RUSAK: "RUSAK",
  DIHAPUSKAN: "DIHAPUSKAN",
} as const;
export type InventoryCondition = (typeof InventoryCondition)[keyof typeof InventoryCondition];
