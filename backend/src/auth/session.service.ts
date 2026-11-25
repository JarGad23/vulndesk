import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, type PublicUser } from '../users/public-user.js';

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lte: new Date(now) } },
    });
    await this.prisma.session.create({
      data: {
        tokenHash: this.digest(token),
        userId,
        expiresAt: new Date(now + SESSION_TTL_MS),
      },
    });
    return token;
  }

  async findUser(token: string): Promise<PublicUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.digest(token) },
      select: { expiresAt: true, user: { select: publicUserSelect } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.active)
      return null;
    return session.user;
  }

  async destroy(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.digest(token) },
    });
  }

  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
