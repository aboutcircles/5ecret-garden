/**
 * Error Handler Utility - Centralized error handling with user notifications
 * Provides consistent error handling patterns across the application
 */

import { notifyError, notifyWarning } from '$lib/stores/notifications.svelte';
import { getErrorMessage } from '$lib/utils/sdkAdapters';

/**
 * Error context for categorizing errors
 */
export type ErrorContext =
  | 'wallet'
  | 'sdk'
  | 'network'
  | 'transaction'
  | 'profile'
  | 'storage'
  | 'unknown';

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Context where the error occurred */
  context?: ErrorContext;
  /** Whether to show a user notification (default: true) */
  notify?: boolean;
  /** Whether to log to console (default: true) */
  log?: boolean;
  /** Custom title for the notification */
  title?: string;
  /** Fallback value to return instead of throwing */
  fallback?: unknown;
  /** Whether to rethrow the error after handling (default: false) */
  rethrow?: boolean;
}

/**
 * Known error patterns that should be handled gracefully (not shown to user)
 */
const SILENT_ERROR_PATTERNS = [
  'No balances found',
  'No transactions found',
  'Avatar not found',
  'User rejected',
  'User denied',
];

/**
 * Check if an error should be handled silently (no user notification)
 */
function isSilentError(message: string): boolean {
  return SILENT_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Get a user-friendly title based on error context
 */
function getContextTitle(context: ErrorContext): string {
  const titles: Record<ErrorContext, string> = {
    wallet: 'Wallet Error',
    sdk: 'SDK Error',
    network: 'Network Error',
    transaction: 'Transaction Error',
    profile: 'Profile Error',
    storage: 'Storage Error',
    unknown: 'Error',
  };
  return titles[context];
}

/**
 * Handle an error with optional user notification and logging
 *
 * @param error - The error to handle
 * @param options - Error handling options
 * @returns The fallback value if provided, otherwise undefined
 *
 * @example
 * ```ts
 * try {
 *   await someOperation();
 * } catch (error) {
 *   return handleError(error, {
 *     context: 'transaction',
 *     fallback: null,
 *   });
 * }
 * ```
 */
export function handleError<T = undefined>(
  error: unknown,
  options: ErrorHandlerOptions = {}
): T | undefined {
  const {
    context = 'unknown',
    notify = true,
    log = true,
    title,
    fallback,
    rethrow = false,
  } = options;

  const message = getErrorMessage(error);

  // Log to console if enabled
  if (log) {
    const contextLabel = context !== 'unknown' ? `[${context}] ` : '';
    console.error(`❌ ${contextLabel}${message}`);
    if (error instanceof Error && error.stack) {
      console.debug(error.stack);
    }
  }

  // Show notification if enabled and not a silent error
  if (notify && !isSilentError(message)) {
    const notificationTitle = title || getContextTitle(context);
    notifyError(message, notificationTitle);
  }

  // Rethrow if requested
  if (rethrow) {
    throw error;
  }

  return fallback as T | undefined;
}

/**
 * Handle a warning (less severe than error)
 * Logs to console and optionally shows a warning notification
 *
 * @param message - Warning message
 * @param options - Handler options
 */
export function handleWarning(
  message: string,
  options: { notify?: boolean; context?: ErrorContext } = {}
): void {
  const { notify = true, context = 'unknown' } = options;

  const contextLabel = context !== 'unknown' ? `[${context}] ` : '';
  console.warn(`⚠️ ${contextLabel}${message}`);

  if (notify) {
    notifyWarning(message);
  }
}

/**
 * Async wrapper that handles errors automatically
 * Useful for wrapping async operations with consistent error handling
 *
 * @param operation - The async operation to execute
 * @param options - Error handling options
 * @returns The operation result or fallback value on error
 *
 * @example
 * ```ts
 * const profile = await withErrorHandling(
 *   () => getProfile(address),
 *   { context: 'profile', fallback: null }
 * );
 * ```
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions & { fallback: T }
): Promise<T>;
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: ErrorHandlerOptions
): Promise<T | undefined>;
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    return handleError<T>(error, options);
  }
}
