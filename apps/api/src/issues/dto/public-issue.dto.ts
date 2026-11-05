import { IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const ISSUE_CATEGORIES = [
  "PERANGKAT",
  "JARINGAN",
  "LISTRIK",
  "PERANGKAT_LUNAK",
  "FASILITAS",
  "LAINNYA",
];

/** Laporan kendala dari halaman publik (tanpa akun). */
export class CreatePublicIssueDto {
  @IsString()
  labId: string;

  @IsIn(ISSUE_CATEGORIES, { message: "Kategori tidak valid" })
  kategori: string;

  @IsOptional()
  @IsIn(["RENDAH", "SEDANG", "TINGGI"], { message: "Urgensi tidak valid" })
  urgensi?: string;

  @IsString()
  @MinLength(10, { message: "Deskripsi minimal 10 karakter" })
  @MaxLength(2000)
  deskripsi: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotoUrls?: string[];

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  namaPelapor: string;

  @IsEmail({}, { message: "Email tidak valid" })
  @MaxLength(160)
  emailPelapor: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  noWhatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nim?: string;
}
