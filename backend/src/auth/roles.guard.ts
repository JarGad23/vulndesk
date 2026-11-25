import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../generated/prisma/client.js';
import { type AuthenticatedRequest, ROLES } from './auth.decorators.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roles.includes(user.role))
      throw new ForbiddenException('Brak uprawnień.');
    return true;
  }
}
