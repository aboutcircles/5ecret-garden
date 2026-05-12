/**
 * Retry utility with exponential backoff for resilient network operations.
 *
 * Use this for:
 * - WebSocket subscription setup
 * - RPC calls that may fail transiently
 * - Any network operation that should survive brief outages
 */

import {
  connectionStatus,
  setRetrying,
  setConnected,
  setFailed,
  resetConnectionStatus,
} from '$lib/shared/state/connectionStatus.svelte';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxAttempts?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Optional callback on each retry attempt */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
  /** Optional predicate to determine if error is retryable (default: all errors) */
  isRetryable?: (error: Error) => boolean;
  /** Update global connection status store for UI feedback (default: false) */
  updateConnectionStatus?: boolean;
  /** Label for connection status (e.g., "Wallet", "Avatar") */
  statusLabel?: string;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable'>> = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  updateConnectionStatus: false,
  statusLabel: 'Connection',
};

/**
 * Calculate delay for a given attempt with exponential backoff and optional jitter.
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential: initialDelay * multiplier^attempt
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  if (!jitter) return cappedDelay;

  // Add ±25% jitter to spread out retry storms
  const jitterFactor = 0.75 + Math.random() * 0.5;
  return Math.floor(cappedDelay * jitterFactor);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic and exponential backoff.
 *
 * @example
 * ```ts
 * const avatar = await withRetry(
 *   () => sdk.getAvatar(address, true),
 *   {
 *     maxAttempts: 5,
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error.message}`)
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const updateStatus = opts.updateConnectionStatus;
  const label = opts.statusLabel;
  let lastError: Error = new Error('No attempts made');

  // Don't show banner for initial connection - only for retries/failures
  // Users don't need to see "Connecting..." if everything works

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const result = await fn();
      // Success - only show "connected" if banner was visible (from retries)
      if (updateStatus && connectionStatus.status !== 'idle') {
        setConnected();
        setTimeout(() => resetConnectionStatus(), 1500);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this error type should be retried
      if (opts.isRetryable && !opts.isRetryable(lastError)) {
        if (updateStatus && connectionStatus.status !== 'idle') {
          resetConnectionStatus();
        }
        throw lastError;
      }

      // Don't retry after last attempt
      if (attempt === opts.maxAttempts - 1) {
        break;
      }

      const delayMs = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier,
        opts.jitter
      );

      // Show banner only when retrying - this is when users need feedback
      if (updateStatus) {
        setRetrying(attempt + 1, opts.maxAttempts, lastError.message, delayMs);
      }

      // Notify caller of retry
      if (opts.onRetry) {
        opts.onRetry(attempt + 1, lastError, delayMs);
      }

      await sleep(delayMs);
    }
  }

  // All retries exhausted - show failure
  if (updateStatus) {
    setFailed(lastError.message);
  }

  throw lastError;
}

/**
 * Check if an error is likely a transient network/connection issue worth retrying.
 * Use as `isRetryable` option for withRetry().
 */
export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();

  const transientPatterns = [
    'connection',
    'timeout',
    'network',
    'econnrefused',
    'econnreset',
    'socket',
    'websocket',
    'subscribe',
    'not connected',
    'disconnected',
    'interrupted',
    'etimedout',
    'enotfound',
    'unavailable',
    'rate limit',
    '429', // Too many requests
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
  ];

  return transientPatterns.some(pattern => message.includes(pattern));
}

/**
 * Create a retryable version of an async function.
 * Useful for wrapping SDK methods that may fail transiently.
 *
 * @example
 * ```ts
 * const getAvatarWithRetry = createRetryable(
 *   (address: string, subscribe: boolean) => sdk.getAvatar(address, subscribe),
 *   { maxAttempts: 3 }
 * );
 * const avatar = await getAvatarWithRetry(userAddress, true);
 * ```
 */
export function createRetryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}
