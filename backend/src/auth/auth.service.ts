import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, type PublicUser } from '../users/public-user.js';
import { LoginDto } from './login.dto.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async login({
    email,
    password,
  }: LoginDto): Promise<{ user: PublicUser; token: string }> {
    const found = await this.prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, passwordHash: true },
    });
    const matches = await this.passwords.verify(found?.passwordHash, password);
    // One message for every failure: unknown e-mail, wrong password, blocked account.
    if (!found || !matches || !found.active) {
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło.');
    }
    const { passwordHash: _, ...user } = found;
    return { user, token: await this.sessions.create(user.id) };
  }
}
