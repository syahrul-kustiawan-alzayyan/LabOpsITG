import { Type } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Pengajuan peminjaman dari halaman publik (tanpa akun). */
export class CreatePublicBookingDto {
  @IsString()
  labId: string;

  @IsDateString()
  tanggal: string;

  @Matches(TIME, { message: "Jam mulai tidak valid (HH:MM)" })
  jamMulai: string;

  @Matches(TIME, { message: "Jam selesai tidak valid (HH:MM)" })
  jamSelesai: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  keperluan: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jumlahPeserta?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  kebutuhanKhusus?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  namaPeminjam: string;

  @IsEmail({}, { message: "Email tidak valid" })
  @MaxLength(160)
  emailPeminjam: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  noWhatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nim?: string;
}
