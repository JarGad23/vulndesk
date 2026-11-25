import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../config.js';
import { SESSION_TTL_MS } from './session.service.js';

const NAME = 'vulndesk_session';
// SameSite=Lax keeps the cookie off cross-site POST/PATCH requests (CSRF).
const OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

export function readSessionToken(request: Request): string | undefined {
  const value: unknown = (request.cookies as Record<string, unknown>)[NAME];
  return typeof value === 'string' ? value : undefined;
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(NAME, token, { ...OPTIONS, maxAge: SESSION_TTL_MS });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(NAME, OPTIONS);
}
