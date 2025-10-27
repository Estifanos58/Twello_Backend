import { SignJWT, jwtVerify } from 'jose';
import config from '../config/index.js';
import { randomBytes } from 'crypto';

// Convert secrets to Uint8Array for jose
const accessTokenSecret = new TextEncoder().encode(config.jwt.accessTokenSecret);
const refreshTokenSecret = new TextEncoder().encode(config.jwt.refreshTokenSecret);

export interface AccessTokenPayload {
  sub: string; // user id
  role: string; // global role (USER, ADMIN)
  typ: 'access';
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // unique token id
  typ: 'refresh';
  [key: string]: unknown;
}

/**
 * Parse TTL string (e.g., "15m", "30d") to seconds
 */
function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

/**
 * Generate a unique JWT ID (jti)
 */
export function generateJTI(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create an access token
 */
export async function createAccessToken(userId: string, role: string): Promise<string> {
  const ttlSeconds = parseTTL(config.jwt.accessTokenTTL);

  const token = await new SignJWT({
    sub: userId,
    role,
    typ: 'access',
  } as AccessTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(accessTokenSecret);

  return token;
}

/**
 * Create a refresh token with JTI
 */
export async function createRefreshToken(userId: string, jti: string): Promise<string> {
  const ttlSeconds = parseTTL(config.jwt.refreshTokenTTL);

  const token = await new SignJWT({
    sub: userId,
    jti,
    typ: 'refresh',
  } as RefreshTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(refreshTokenSecret);

  return token;
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, accessTokenSecret);
    
    if (payload.typ !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload as unknown as AccessTokenPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
    throw new Error('Invalid access token');
  }
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, refreshTokenSecret);
    
    if (payload.typ !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload as unknown as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
    throw new Error('Invalid refresh token');
  }
}

/**
 * Get token expiration time in milliseconds
 */
export function getRefreshTokenExpiry(): Date {
  const ttlSeconds = parseTTL(config.jwt.refreshTokenTTL);
  return new Date(Date.now() + ttlSeconds * 1000);
}

/**
 * Generate a secure random code for password reset
 */
export function generateResetCode(): string {
  return randomBytes(32).toString('hex');
}
