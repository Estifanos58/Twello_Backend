import * as jose from 'jose';
import config from '../config/index.js';
import { randomBytes } from 'crypto';

export interface AccessTokenPayload {
  sub: string; // user ID
  role: string;
}

export interface RefreshTokenPayload {
  sub: string; // user ID
  jti: string; // JWT ID for tracking
  role?: string;
}

/**
 * Create an access token
 */
export async function createAccessToken(userId: string, role: string): Promise<string> {
  const secret = new TextEncoder().encode(config.jwt.accessTokenSecret);
  
  const token = await new jose.SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwt.accessTokenTTL)
    .sign(secret);

  return token;
}

/**
 * Create a refresh token
 */
export async function createRefreshToken(userId: string, jti: string): Promise<string> {
  const secret = new TextEncoder().encode(config.jwt.refreshTokenSecret);
  
  const token = await new jose.SignJWT({ jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwt.refreshTokenTTL)
    .sign(secret);

  return token;
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const secret = new TextEncoder().encode(config.jwt.accessTokenSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    
    if (!payload.sub) {
      throw new Error('Invalid token: missing subject');
    }
    
    return {
      sub: payload.sub,
      role: (payload.role as string) || 'USER',
    };
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const secret = new TextEncoder().encode(config.jwt.refreshTokenSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    
    if (!payload.sub || !payload.jti) {
      throw new Error('Invalid token: missing required claims');
    }
    
    return {
      sub: payload.sub,
      jti: payload.jti as string,
      role: payload.role as string | undefined,
    };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Generate a unique JWT ID
 */
export function generateJTI(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get refresh token expiry date
 */
export function getRefreshTokenExpiry(): Date {
  // Default to 30 days
  const days = 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Generate a password reset code
 */
export function generateResetCode(): string {
  // Generate a 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Decode a token without verifying it
 */
export function decodeToken(token: string): jose.JWTPayload | null {
  try {
    return jose.decodeJwt(token);
  } catch (error) {
    return null;
  }
}
