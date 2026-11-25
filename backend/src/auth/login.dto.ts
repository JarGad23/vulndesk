import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../users/normalize-email.js';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
