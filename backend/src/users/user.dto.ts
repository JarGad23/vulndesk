import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../generated/prisma/client.js';
import { NormalizeEmail } from './normalize-email.js';

export class CreateUserDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @IsEnum(Role)
  role: Role;
}

// Optional, but unlike @IsOptional() an explicit null is rejected.
const Optional = () => ValidateIf((_, value) => value !== undefined);

export class UpdateUserDto {
  @Optional()
  @IsEnum(Role)
  role?: Role;

  @Optional()
  @IsBoolean()
  active?: boolean;
}
