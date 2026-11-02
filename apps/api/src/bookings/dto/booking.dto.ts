import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateBookingDto {
  @IsString()
  labId: string;

  @IsDateString()
  tanggal: string;

  @IsString()
  @MinLength(4)
  jamMulai: string;

  @IsString()
  @MinLength(4)
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

  @IsOptional()
  @IsString()
  lampiranUrl?: string;

  @IsOptional()
  @IsString()
  peminjamId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class RejectBookingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  alasan: string;
}
