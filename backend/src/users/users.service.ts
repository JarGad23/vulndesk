import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PasswordService } from '../auth/password.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, type PublicUser } from './public-user.js';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  list(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { email: 'asc' },
    });
  }

  async create({ password, ...data }: CreateUserDto): Promise<PublicUser> {
    const passwordHash = await this.passwords.hash(password);
    try {
      return await this.prisma.user.create({
        data: { ...data, passwordHash },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Użytkownik z tym adresem już istnieje.');
      }
      throw error;
    }
  }

  async update(
    actor: PublicUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUser> {
    // An admin cannot lock themselves out.
    if (actor.id === id)
      throw new ConflictException(
        'Nie możesz zmienić roli ani statusu własnego konta.',
      );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: dto,
          select: publicUserSelect,
        });
        if (!user.active)
          await tx.session.deleteMany({ where: { userId: id } });
        return user;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Nie znaleziono użytkownika.');
      }
      throw error;
    }
  }
}
