import { NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { AppModule } from '../app.module.js';
import { CreateUserDto } from '../users/user.dto.js';
import { UsersService } from '../users/users.service.js';

// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
const dto = plainToInstance(CreateUserDto, {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  name: process.env.ADMIN_NAME ?? 'Administrator',
  role: 'ADMIN',
});
// Without the target, a validation error cannot print the password.
await validateOrReject(dto, {
  validationError: { target: false, value: false },
});

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error'],
});
try {
  const user = await app.get(UsersService).create(dto);
  console.log(`Created ${user.email}`);
} finally {
  await app.close();
}
