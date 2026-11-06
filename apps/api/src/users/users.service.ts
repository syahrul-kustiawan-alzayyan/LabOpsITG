import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

type Actor = { id: string; role: string };

/** Sub-role akun yang boleh dibuat/dikelola koordinator. */
const PROVISIONABLE_SUBROLES = ["MAHASISWA", "INSTRUKTUR", "ASISTEN_DOSEN"];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Koordinator hanya boleh mengelola akun non-privileged (role USER). */
  private assertCoordinatorScope(actor: Actor | undefined, targetRole: string | undefined, subRoles?: string[]) {
    if (actor?.role !== "COORDINATOR") return;
    if (targetRole && targetRole !== "USER") {
      throw new ForbiddenException("Koordinator hanya dapat mengelola akun mahasiswa, instruktur, atau asisten dosen");
    }
    if (subRoles?.some((r) => !PROVISIONABLE_SUBROLES.includes(r))) {
      throw new ForbiddenException("Sub-role tersebut tidak dapat diberikan oleh koordinator");
    }
  }

  findAll(q?: { search?: string; role?: string; status?: string; page?: number; pageSize?: number; prodiId?: string; periodeId?: string }) {
    const page = q?.page || 1;
    const pageSize = Math.min(q?.pageSize || 20, 100);
    const where: any = { deletedAt: null };
    if (q?.search) where.OR = [{ nama: { contains: q.search, mode: "insensitive" } }, { email: { contains: q.search, mode: "insensitive" } }];
    if (q?.role) where.role = q.role;
    if (q?.status) where.status = q.status;
    if (q?.prodiId) where.prodiId = q.prodiId;
    if (q?.periodeId) where.periodeId = q.periodeId;
    return this.prisma.user.findMany({
      where,
      select: { id: true, nama: true, email: true, role: true, subRoles: true, prodiId: true, periodeId: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, nama: true, email: true, role: true, subRoles: true, status: true } });
  }

  async create(data: { nama: string; email: string; password: string; role?: any; subRoles?: any[] }, actor?: Actor) {
    this.assertCoordinatorScope(actor, data.role, data.subRoles);
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new BadRequestException("Email sudah terdaftar");
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { nama: data.nama, email: data.email, passwordHash, role: data.role || "USER", subRoles: data.subRoles || [] },
      select: { id: true, nama: true, email: true, role: true, subRoles: true, status: true },
    });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "CREATE_USER", objectType: "User", objectId: user.id, newValue: user });
    return user;
  }

  async update(id: string, data: { nama?: string; role?: any; subRoles?: any[]; status?: any }, actor?: Actor) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    this.assertCoordinatorScope(actor, before?.role, data.subRoles);
    if (actor?.role === "COORDINATOR" && data.role && data.role !== before?.role) {
      throw new ForbiddenException("Koordinator tidak dapat mengubah role akun");
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { nama: data.nama, role: data.role, subRoles: data.subRoles, status: data.status },
      select: { id: true, nama: true, email: true, role: true, subRoles: true, status: true },
    });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "UPDATE_USER", objectType: "User", objectId: id, oldValue: before, newValue: user });
    return user;
  }

  async deactivate(id: string, actor?: Actor) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    this.assertCoordinatorScope(actor, before?.role);
    const user = await this.prisma.user.update({ where: { id }, data: { status: "INACTIVE", deletedAt: new Date() } });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "DEACTIVATE_USER", objectType: "User", objectId: id, oldValue: before, newValue: user });
    return { ok: true };
  }

  async resetPassword(id: string, newPassword: string, actor?: Actor) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    this.assertCoordinatorScope(actor, before?.role);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    if (actor?.id) await this.audit.log({ actorId: actor.id, action: "RESET_PASSWORD", objectType: "User", objectId: id });
    return { ok: true };
  }

  async importCsv(rows: { nama: string; email: string; password?: string; role?: string; subRoles?: string }[], actorId?: string) {
    const results: { row: number; email: string; status: "ok" | "error"; message?: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        await this.create(
          {
            nama: r.nama,
            email: r.email,
            password: r.password || "ChangeMe123",
            role: (r.role as any) || "USER",
            subRoles: r.subRoles ? r.subRoles.split(";").map((s) => s.trim()).filter(Boolean) : [],
          },
          actorId ? { id: actorId, role: "ADMIN_SYSTEM" } : undefined,
        );
        results.push({ row: i + 1, email: r.email, status: "ok" });
      } catch (e: any) {
        results.push({ row: i + 1, email: r.email, status: "error", message: e?.message || "Gagal" });
      }
    }
    return results;
  }
}
