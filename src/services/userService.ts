import { query, transaction } from '../db/pool.js';
import { hashPassword } from '../utils/password.js';
import { logAdminAction } from './logger/loggingService.js';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  global_status: string;
  created_at: Date;
  updated_at: Date;
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT id, email, full_name, role, global_status, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT id, email, full_name, role, global_status, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function updateUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const { comparePassword } = await import('../utils/password.js');
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  const currentHash = result.rows[0].password_hash;
  const isValid = await comparePassword(oldPassword, currentHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }
  const newHash = await hashPassword(newPassword);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
    [newHash, userId]
  );
}

export async function banUser(
  adminId: string,
  targetUserId: string,
  ipAddress: string
): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      `UPDATE users SET global_status = 'BANNED', updated_at = now() WHERE id = $1`,
      [targetUserId]
    );
    await client.query(
      'UPDATE user_devices SET is_revoked = true WHERE user_id = $1',
      [targetUserId]
    );
    await client.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [targetUserId]
    );
  });
  logAdminAction(adminId, 'USER_BANNED', targetUserId, ipAddress);
}

export async function unbanUser(
  adminId: string,
  targetUserId: string,
  ipAddress: string
): Promise<void> {
  await query(
    `UPDATE users SET global_status = 'ACTIVE', updated_at = now() WHERE id = $1`,
    [targetUserId]
  );
  logAdminAction(adminId, 'USER_UNBANNED', targetUserId, ipAddress);
}

export async function adminResetUserPassword(
  adminId: string,
  targetUserId: string,
  newPassword: string,
  ipAddress: string
): Promise<void> {
  const newHash = await hashPassword(newPassword);
  await transaction(async (client) => {
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newHash, targetUserId]
    );
    await client.query(
      'UPDATE user_devices SET is_revoked = true WHERE user_id = $1',
      [targetUserId]
    );
    await client.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [targetUserId]
    );
  });
  logAdminAction(adminId, 'ADMIN_RESET_PASSWORD', targetUserId, ipAddress);
}

export async function getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
  const result = await query<User>(
    `SELECT id, email, full_name, role, global_status, created_at, updated_at 
     FROM users 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}