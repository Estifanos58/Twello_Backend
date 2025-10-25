import { query, transaction } from '../db/pool.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  generateJTI,
  getRefreshTokenExpiry,
  generateResetCode,
} from '../utils/jwt.js';
import { logInfo, logError } from './logger/index.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  global_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeviceInfo {
  ipAddress: string;
  userAgent: string;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  fullName?: string
): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, full_name, role, global_status) 
       VALUES ($1, $2, $3, 'USER', 'ACTIVE') 
       RETURNING *`,
      [email, passwordHash, fullName || null]
    );

    const user = result.rows[0];

    logInfo(`New user registered: ${email}`);

    // Remove password hash from returned user
    delete (user as any).password_hash;

    return user;
  } catch (error) {
    logError(`Registration failed for ${email}: ${error}`);
    throw error;
  }
}

/**
 * Authenticate user and create session
 */
export async function login(
  email: string,
  password: string,
  deviceInfo: DeviceInfo
): Promise<{ user: User; tokens: AuthTokens }> {
  try {
    // Find user by email
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logInfo(`Login failed for ${email}: User not found from ${deviceInfo.ipAddress}`);
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if user is banned
    if (user.global_status === 'BANNED') {
      logInfo(`Login failed for ${email}: User is banned from ${deviceInfo.ipAddress}`);
      throw new Error('Account has been banned');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      logInfo(`Login failed for ${email}: Invalid password from ${deviceInfo.ipAddress}`);
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const jti = generateJTI();
    const accessToken = await createAccessToken(user.id, user.role);
    const refreshToken = await createRefreshToken(user.id, jti);

    // Store device and refresh token
    await transaction(async (client) => {
      // Insert device record
      const deviceResult = await client.query(
        `INSERT INTO user_devices (user_id, jti, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [user.id, jti, deviceInfo.ipAddress, deviceInfo.userAgent]
      );

      const deviceId = deviceResult.rows[0].id;

      // Insert refresh token record
      await client.query(
        `INSERT INTO refresh_tokens (jti, user_id, device_id, expires_at) 
         VALUES ($1, $2, $3, $4)`,
        [jti, user.id, deviceId, getRefreshTokenExpiry()]
      );
    });

    logInfo(`User logged in: ${email} from ${deviceInfo.ipAddress}`);

    // Remove password hash from returned user
    delete (user as any).password_hash;

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    logError(`Login error for ${email}: ${error}`);
    throw error;
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  deviceInfo: DeviceInfo
): Promise<AuthTokens> {
  try {
    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);

    // Check if token exists and is not revoked
    const tokenResult = await query(
      `SELECT rt.*, ud.ip_address, ud.user_agent 
       FROM refresh_tokens rt
       JOIN user_devices ud ON rt.device_id = ud.id
       WHERE rt.jti = $1 AND rt.revoked_at IS NULL`,
      [payload?.jti]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or revoked refresh token');
    }

    const tokenRecord = tokenResult.rows[0];

    // Verify device info matches
    if (
      tokenRecord.ip_address !== deviceInfo.ipAddress ||
      tokenRecord.user_agent !== deviceInfo.userAgent
    ) {
      logInfo(
        `Suspicious token refresh attempt for user ${payload.sub} from different device`
      );
      // Optionally revoke the token here
    }

    // Generate new tokens
    const newJti = generateJTI();
    const accessToken = await createAccessToken(
      payload.sub,
      payload.role || 'USER'
    );
    const newRefreshToken = await createRefreshToken(payload.sub, newJti);

    // Update refresh token
    await transaction(async (client) => {
      // Revoke old token
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1',
        [payload.jti]
      );

      // Insert new token
      await client.query(
        `INSERT INTO refresh_tokens (jti, user_id, device_id, expires_at) 
         VALUES ($1, $2, $3, $4)`,
        [newJti, payload.sub, tokenRecord.device_id, getRefreshTokenExpiry()]
      );

      // Update device JTI
      await client.query('UPDATE user_devices SET jti = $1 WHERE id = $2', [
        newJti,
        tokenRecord.device_id,
      ]);
    });

    logInfo(`Token refreshed for user ${payload.sub}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    logError(`Token refresh error: ${error}`);
    throw error;
  }
}

/**
 * Logout and revoke refresh token
 */
export async function logout(
  refreshToken: string,
  ipAddress: string
): Promise<void> {
  try {
    const payload = await verifyRefreshToken(refreshToken);

    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1',
      [payload.jti]
    );

    logInfo(`User logged out: ${payload.sub} from ${ipAddress}`);
  } catch (error) {
    logError(`Logout error: ${error}`);
    // Don't throw error on logout
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Verify old password
    const isValidPassword = await comparePassword(oldPassword, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    logInfo(`Password updated for user ${userId}`);
  } catch (error) {
    logError(`Password update error for user ${userId}: ${error}`);
    throw error;
  }
}

/**
 * Generate password reset code
 */
export async function generatePasswordResetCode(email: string): Promise<string> {
  try {
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists
      logInfo(`Password reset requested for non-existent email: ${email}`);
      return generateResetCode(); // Return fake code
    }

    const user = result.rows[0];
    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code
    await query(
      `INSERT INTO password_reset_codes (user_id, code, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, code, expiresAt]
    );

    logInfo(`Password reset code generated for user ${user.id}`);

    return code;
  } catch (error) {
    logError(`Error generating password reset code: ${error}`);
    throw error;
  }
}

/**
 * Reset password with code
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  try {
    const result = await query(
      `SELECT prc.*, u.id as user_id
       FROM password_reset_codes prc
       JOIN users u ON prc.user_id = u.id
       WHERE u.email = $1 AND prc.code = $2 AND prc.used_at IS NULL AND prc.expires_at > NOW()
       ORDER BY prc.created_at DESC
       LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset code');
    }

    const resetRecord = result.rows[0];

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and mark code as used
    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, resetRecord.user_id]
      );

      await client.query(
        'UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1',
        [resetRecord.id]
      );
    });

    logInfo(`Password reset successfully for user ${resetRecord.user_id}`);
  } catch (error) {
    logError(`Password reset error: ${error}`);
    throw error;
  }
}

/**
 * Get user devices
 */
export async function getUserDevices(userId: string): Promise<any[]> {
  try {
    const result = await query(
      `SELECT id, jti, ip_address, user_agent, last_used_at, created_at
       FROM user_devices
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY last_used_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logError(`Error fetching user devices: ${error}`);
    throw error;
  }
}

/**
 * Revoke device
 */
export async function revokeDevice(userId: string, deviceId: string): Promise<void> {
  try {
    await transaction(async (client) => {
      // Revoke device
      await client.query(
        'UPDATE user_devices SET revoked_at = NOW() WHERE id = $1 AND user_id = $2',
        [deviceId, userId]
      );

      // Revoke associated refresh tokens
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE device_id = $1',
        [deviceId]
      );
    });

    logInfo(`Device ${deviceId} revoked for user ${userId}`);
  } catch (error) {
    logError(`Error revoking device: ${error}`);
    throw error;
  }
}
