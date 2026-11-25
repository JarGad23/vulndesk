import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
// Optional, but unlike @IsOptional() an explicit null is rejected.
const Optional = () => ValidateIf((_, value) => value !== undefined);
// PostgreSQL text cannot store NUL.
const NoNul = () => Matches(/^[^\0]*$/);

export class CreateProjectDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @NoNul()
  name: string;

  @Optional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  @NoNul()
  description?: string;
}

export class UpdateProjectDto {
  @Optional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @NoNul()
  name?: string;

  @Optional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  @NoNul()
  description?: string;

  @Optional()
  @IsBoolean()
  archived?: boolean;
}
