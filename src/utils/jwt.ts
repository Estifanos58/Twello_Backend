import * as jose from 'jose';
import config from '../config/index.js';

/**
 * Generate an access token
 * @param payload Token payload
 * @returns JWT token string
 */
export async function generateAccessToken(payload: Record<string, any>): Promise<string> {
  const secret = new TextEncoder().encode(config.jwt.accessTokenSecret);
  
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.accessTokenTTL)
    .sign(secret);

  return token;
}

/**
 * Generate a refresh token
 * @param payload Token payload
 * @returns JWT token string
 */
export async function generateRefreshToken(payload: Record<string, any>): Promise<string> {
  const secret = new TextEncoder().encode(config.jwt.refreshTokenSecret);
  
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.refreshTokenTTL)
    .sign(secret);

  return token;
}

/**
 * Verify an access token
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyAccessToken(token: string): Promise<jose.JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(config.jwt.accessTokenSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify a refresh token
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyRefreshToken(token: string): Promise<jose.JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(config.jwt.refreshTokenSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a token without verifying it
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): jose.JWTPayload | null {
  try {
    return jose.decodeJwt(token);
  } catch (error) {
    return null;
  }
}
