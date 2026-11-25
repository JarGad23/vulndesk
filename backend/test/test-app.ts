import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PasswordService } from '../src/auth/password.service.js';
import { configureApp } from '../src/configure-app.js';
import type { Role } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export const PASSWORD = 'correct-horse-battery';

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  const passwordHash = await app.get(PasswordService).hash(PASSWORD);
  const http = () => request(app.getHttpServer());

  return {
    app,
    prisma,
    http,
    reset: () =>
      prisma.$executeRaw`TRUNCATE "User", "Session", "Project", "Import", "Vulnerability", "HistoryEntry", "LoginWindow" CASCADE`,
    createUser: (email: string, role: Role = 'DEVELOPER', active = true) =>
      prisma.user.create({
        data: { email, name: email, role, active, passwordHash },
      }),
    async login(email: string): Promise<string> {
      const response = await http()
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      return response.get('Set-Cookie')![0].split(';')[0];
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
