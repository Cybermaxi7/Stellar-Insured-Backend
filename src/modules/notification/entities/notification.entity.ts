/**
 * Notification type enum for categorizing notifications.
 */
export type NotificationType = 'claim' | 'policy' | 'dao';

/**
 * Notification entity representing a user notification.
 * Uses in-memory storage for now (no TypeORM integration yet).
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * DTO for creating a notification.
 */
export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}
