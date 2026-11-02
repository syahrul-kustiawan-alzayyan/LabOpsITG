import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(params: { actorId: string; action: string; objectType: string; objectId: string; oldValue?: any; newValue?: any }) {
    return this.prisma.auditLog.create({ data: params });
  }

  findAll() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { nama: true, email: true } } } });
  }
}
