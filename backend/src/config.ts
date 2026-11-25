const LOCAL_DATABASE_URL =
  'postgresql://vulndesk:vulndesk@localhost:5432/vulndesk';

export const isProduction = process.env.NODE_ENV === 'production';

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (isProduction) throw new Error('DATABASE_URL is required in production');
  return LOCAL_DATABASE_URL;
}

/** Number of trusted reverse proxies in front of the API; 0 ignores X-Forwarded-For. */
export function trustedProxies(): number {
  const value = Number(process.env.TRUST_PROXY ?? 0);
  if (!Number.isInteger(value) || value < 0)
    throw new Error('TRUST_PROXY must be a non-negative integer');
  return value;
}
