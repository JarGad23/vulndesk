import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_ATTEMPTS = 5;

@Injectable()
export class LoginLimiter {
  constructor(private readonly prisma: PrismaService) {}

  /** Counts the attempt in one atomic statement, so parallel requests cannot exceed the limit. */
  async consume(ip: string): Promise<void> {
    const [row] = await this.prisma.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "LoginWindow" AS w ("ip", "windowStart", "attempts")
      VALUES (${ip}, now(), 1)
      ON CONFLICT ("ip") DO UPDATE SET
        "attempts" = CASE WHEN w."windowStart" <= now() - interval '1 minute' THEN 1 ELSE w."attempts" + 1 END,
        "windowStart" = CASE WHEN w."windowStart" <= now() - interval '1 minute' THEN now() ELSE w."windowStart" END
      RETURNING "attempts"`;
    if (row.attempts > MAX_ATTEMPTS) {
      throw new HttpException(
        'Zbyt wiele prób logowania. Spróbuj za minutę.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
