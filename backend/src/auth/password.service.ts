import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 defaults to Argon2id; costs follow the OWASP baseline.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class PasswordService {
  private readonly dummyHash = hash('timing-equalizer', OPTIONS);

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  /** Does the same work for a missing hash, so timing does not reveal which accounts exist. */
  async verify(
    passwordHash: string | undefined,
    password: string,
  ): Promise<boolean> {
    const matches = await verify(
      passwordHash ?? (await this.dummyHash),
      password,
    );
    return passwordHash !== undefined && matches;
  }
}
