import { describe, test, expect } from 'bun:test';
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken, generateJTI } from '../../utils/jwt';

describe('JWT Utilities', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const role = 'USER';

  describe('Access Token', () => {
    test('should create and verify access token', async () => {
      const token = await createAccessToken(userId, role);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = await verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.role).toBe(role);
      expect(payload.typ).toBe('access');
    });

    test('should reject invalid access token', async () => {
      expect(async () => {
        await verifyAccessToken('invalid.token.here');
      }).toThrow();
    });
  });

  describe('Refresh Token', () => {
    test('should create and verify refresh token', async () => {
      const jti = generateJTI();
      const token = await createRefreshToken(userId, jti);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = await verifyRefreshToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.jti).toBe(jti);
      expect(payload.typ).toBe('refresh');
    });

    test('should reject invalid refresh token', async () => {
      expect(async () => {
        await verifyRefreshToken('invalid.token.here');
      }).toThrow();
    });
  });

  describe('JTI Generation', () => {
    test('should generate unique JTI', () => {
      const jti1 = generateJTI();
      const jti2 = generateJTI();

      expect(jti1).toBeDefined();
      expect(jti2).toBeDefined();
      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBeGreaterThan(0);
    });
  });
});
