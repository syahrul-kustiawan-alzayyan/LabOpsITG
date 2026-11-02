import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(recipientId: string, jenis: string, isi: string) {
    return this.prisma.notification.create({ data: { recipientId, jenis, isi } });
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { recipientId: userId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, recipientId: userId }, data: { isRead: true } });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { recipientId: userId, isRead: false } });
  }
}
