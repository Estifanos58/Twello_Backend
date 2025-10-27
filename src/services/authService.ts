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
import {
  logLoginSuccess,
  logAuthFailure,
  logLogout,
  logTokenRefresh,
  logDeviceRevoked,
} from './loggingService.js';

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

  // Remove password hash from returned user
  delete (user as any).password_hash;

  return user;
}

/**
 * Authenticate user and create session
 */
export async function login(
  email: string,
  password: string,
  deviceInfo: DeviceInfo
): Promise<{ user: User; tokens: AuthTokens }> {
  // Find user by email
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    logAuthFailure(email, deviceInfo.ipAddress, 'User not found');
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];

  // Check if user is banned
  if (user.global_status === 'BANNED') {
    logAuthFailure(email, deviceInfo.ipAddress, 'User is banned');
    throw new Error('Account has been banned');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    logAuthFailure(email, deviceInfo.ipAddress, 'Invalid password');
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

  // Log successful login
  logLoginSuccess(user.id, deviceInfo.ipAddress, deviceInfo.userAgent);

  // Remove password hash from returned user
  delete (user as any).password_hash;

  return {
    user,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  deviceInfo: DeviceInfo
): Promise<AuthTokens> {
  // Verify refresh token
  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }

  const { sub: userId, jti: oldJti } = payload;

  // Check if refresh token exists and is not revoked
  const tokenResult = await query(
    `SELECT rt.*, ud.is_revoked as device_revoked 
     FROM refresh_tokens rt
     JOIN user_devices ud ON ud.jti = rt.jti
     WHERE rt.jti = $1 AND rt.user_id = $2`,
    [oldJti, userId]
  );

  if (tokenResult.rows.length === 0) {
    throw new Error('Refresh token not found');
  }

  const tokenRecord = tokenResult.rows[0];

  if (tokenRecord.is_revoked || tokenRecord.device_revoked) {
    throw new Error('Refresh token has been revoked');
  }

  // Get user info
  const userResult = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  if (user.global_status === 'BANNED') {
    throw new Error('Account has been banned');
  }

  // Rotate refresh token
  const newJti = generateJTI();
  const newAccessToken = await createAccessToken(user.id, user.role);
  const newRefreshToken = await createRefreshToken(user.id, newJti);

  await transaction(async (client) => {
    // Revoke old refresh token
    await client.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE jti = $1',
      [oldJti]
    );

    await client.query(
      'UPDATE user_devices SET is_revoked = true WHERE jti = $1',
      [oldJti]
    );

    // Create new device record
    const deviceResult = await client.query(
      `INSERT INTO user_devices (user_id, jti, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [userId, newJti, deviceInfo.ipAddress, deviceInfo.userAgent]
    );

    const newDeviceId = deviceResult.rows[0].id;

    // Insert new refresh token
    await client.query(
      `INSERT INTO refresh_tokens (jti, user_id, device_id, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [newJti, userId, newDeviceId, getRefreshTokenExpiry()]
    );

    // Update device last_used
    await client.query(
      'UPDATE user_devices SET last_used = now() WHERE id = $1',
      [newDeviceId]
    );
  });

  logTokenRefresh(userId, deviceInfo.ipAddress);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout and revoke refresh token
 */
export async function logout(refreshToken: string, ipAddress: string): Promise<void> {
  try {
    const payload = await verifyRefreshToken(refreshToken);
    const { jti, sub: userId } = payload;

    // Revoke the refresh token and device
    await transaction(async (client) => {
      await client.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE jti = $1',
        [jti]
      );

      await client.query(
        'UPDATE user_devices SET is_revoked = true WHERE jti = $1',
        [jti]
      );
    });

    logLogout(userId, ipAddress);
  } catch (error) {
    // Even if token is invalid, don't throw error on logout
    console.error('Logout error:', error);
  }
}

/**
 * Revoke a specific device/session
 */
export async function revokeDevice(userId: string, deviceId: string, ipAddress: string): Promise<void> {
  // Verify device belongs to user
  const deviceResult = await query(
    'SELECT * FROM user_devices WHERE id = $1 AND user_id = $2',
    [deviceId, userId]
  );

  if (deviceResult.rows.length === 0) {
    throw new Error('Device not found');
  }

  const device = deviceResult.rows[0];

  // Revoke device and associated tokens
  await transaction(async (client) => {
    await client.query(
      'UPDATE user_devices SET is_revoked = true WHERE id = $1',
      [deviceId]
    );

    await client.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE jti = $1',
      [device.jti]
    );
  });

  logDeviceRevoked(userId, deviceId, ipAddress);
}

/**
 * Get all active devices for a user
 */
export async function getUserDevices(userId: string) {
  const result = await query(
    `SELECT id, ip_address, user_agent, login_time, last_used, is_revoked 
     FROM user_devices 
     WHERE user_id = $1 
     ORDER BY login_time DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Generate password reset code
 */
export async function generatePasswordResetCode(email: string): Promise<string> {
  // Find user
  const userResult = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (userResult.rows.length === 0) {
    // Don't reveal if user exists
    throw new Error('If the email exists, a reset code will be sent');
  }

  const user = userResult.rows[0];
  const code = generateResetCode();
  const codeHash = await hashPassword(code);

  // Store reset code (expires in 1 hour)
  await query(
    `INSERT INTO password_resets (user_id, code_hash, expires_at) 
     VALUES ($1, $2, now() + interval '1 hour')`,
    [user.id, codeHash]
  );

  // In production, send email with code
  // For now, return code for testing
  return code;
}

/**
 * Reset password using code
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  // Find user
  const userResult = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Invalid reset code');
  }

  const user = userResult.rows[0];

  // Find valid reset code
  const resetResult = await query(
    `SELECT * FROM password_resets 
     WHERE user_id = $1 AND used = false AND expires_at > now() 
     ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );

  if (resetResult.rows.length === 0) {
    throw new Error('Invalid or expired reset code');
  }

  const resetRecord = resetResult.rows[0];

  // Verify code
  const isValidCode = await comparePassword(code, resetRecord.code_hash);

  if (!isValidCode) {
    throw new Error('Invalid reset code');
  }

  // Update password and mark code as used
  const newPasswordHash = await hashPassword(newPassword);

  await transaction(async (client) => {
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newPasswordHash, user.id]
    );

    await client.query(
      'UPDATE password_resets SET used = true WHERE id = $1',
      [resetRecord.id]
    );

    // Revoke all existing sessions for security
    await client.query(
      'UPDATE user_devices SET is_revoked = true WHERE user_id = $1',
      [user.id]
    );

    await client.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [user.id]
    );
  });
}
