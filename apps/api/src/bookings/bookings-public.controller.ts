import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { CreatePublicBookingDto } from "./dto/public-booking.dto";

/**
 * Endpoint publik untuk halaman informasi.
 * Tidak memakai guard: mahasiswa dapat mengajukan peminjaman tanpa akun.
 */
@Controller("public/bookings")
export class BookingsPublicController {
  constructor(private svc: BookingsService) {}

  @Get("availability")
  availability(@Query() q: any) {
    return this.svc.checkAvailability(q.labId, q.tanggal, q.jamMulai, q.jamSelesai);
  }

  @Post()
  create(@Body() body: CreatePublicBookingDto) {
    return this.svc.createPublic(body);
  }

  @Get("status/:kode")
  status(@Param("kode") kode: string, @Query("email") email: string) {
    return this.svc.findPublicStatus(kode, email);
  }
}
