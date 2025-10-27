import { query } from '../db/pool.js';

export type NotificationStatus = 'DELIVERED' | 'SEEN';

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  recipient_id: string;
  status: NotificationStatus;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: Date;
}

/**
 * Create a notification
 */
export async function createNotification(
  recipientId: string,
  title: string,
  body: string,
  relatedEntityId?: string,
  relatedEntityType?: string
): Promise<Notification> {
  const result = await query<Notification>(
    `INSERT INTO notifications (recipient_id, title, body, related_entity_id, related_entity_type, status) 
     VALUES ($1, $2, $3, $4, $5, 'DELIVERED') 
     RETURNING *`,
    [recipientId, title, body, relatedEntityId || null, relatedEntityType || null]
  );

  return result.rows[0];
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  const result = await query<Notification>(
    `SELECT * FROM notifications 
     WHERE recipient_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM notifications 
     WHERE recipient_id = $1 AND status = 'DELIVERED'`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Mark notification as seen
 */
export async function markNotificationAsSeen(
  notificationId: string,
  userId: string
): Promise<Notification> {
  const result = await query<Notification>(
    `UPDATE notifications 
     SET status = 'SEEN' 
     WHERE id = $1 AND recipient_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Notification not found');
  }

  return result.rows[0];
}

/**
 * Mark all notifications as seen for a user
 */
export async function markAllNotificationsAsSeen(userId: string): Promise<void> {
  await query(
    `UPDATE notifications 
     SET status = 'SEEN' 
     WHERE recipient_id = $1 AND status = 'DELIVERED'`,
    [userId]
  );
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const result = await query(
    'DELETE FROM notifications WHERE id = $1 AND recipient_id = $2',
    [notificationId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Notification not found');
  }
}
