/**
 * Notifications Store - Centralized user notification system
 * Provides reactive state for displaying toasts, alerts, and error messages
 */

import { getErrorMessage } from '$lib/shared/utils/sdkAdapters';

/**
 * Notification severity levels
 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification data structure
 */
export interface Notification {
  id: string;
  level: NotificationLevel;
  message: string;
  title?: string;
  duration?: number; // ms, 0 = persistent
  dismissible?: boolean;
  timestamp: number;
}

/**
 * Default durations by notification level (ms)
 */
const DEFAULT_DURATIONS: Record<NotificationLevel, number> = {
  info: 4000,
  success: 3000,
  warning: 6000,
  error: 8000,
};

/**
 * Notifications state using Svelte 5 runes
 */
export let notifications: Notification[] = $state([]);

/**
 * Counter for generating unique notification IDs
 */
let idCounter = 0;

/**
 * Generate a unique notification ID
 */
function generateId(): string {
  return `notification-${Date.now()}-${++idCounter}`;
}

/**
 * Add a notification to the store
 *
 * @param level - Notification severity level
 * @param message - The message to display
 * @param options - Optional title, duration, dismissible settings
 * @returns The notification ID (can be used to dismiss programmatically)
 */
export function notify(
  level: NotificationLevel,
  message: string,
  options?: {
    title?: string;
    duration?: number;
    dismissible?: boolean;
  }
): string {
  const id = generateId();
  const duration = options?.duration ?? DEFAULT_DURATIONS[level];

  const notification: Notification = {
    id,
    level,
    message,
    title: options?.title,
    duration,
    dismissible: options?.dismissible ?? true,
    timestamp: Date.now(),
  };

  notifications.push(notification);

  // Auto-dismiss after duration (unless persistent)
  if (duration > 0) {
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }

  return id;
}

/**
 * Dismiss a notification by ID
 */
export function dismiss(id: string): void {
  const index = notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
    notifications.splice(index, 1);
  }
}

/**
 * Dismiss all notifications
 */
export function dismissAll(): void {
  notifications.length = 0;
}

/**
 * Convenience function for info notifications
 */
export function notifyInfo(message: string, title?: string): string {
  return notify('info', message, { title });
}

/**
 * Convenience function for success notifications
 */
export function notifySuccess(message: string, title?: string): string {
  return notify('success', message, { title });
}

/**
 * Convenience function for warning notifications
 */
export function notifyWarning(message: string, title?: string): string {
  return notify('warning', message, { title });
}

/**
 * Convenience function for error notifications
 * Accepts an error object and extracts the message
 */
export function notifyError(
  error: unknown,
  title?: string,
  options?: { duration?: number }
): string {
  const message = getErrorMessage(error);
  return notify('error', message, { title, ...options });
}

/**
 * Get the currently visible notifications (reactive)
 */
export function getNotifications(): Notification[] {
  return notifications;
}
