/**
 * Connection status store for tracking retry attempts.
 * Used to show users feedback when WebSocket connections are being retried.
 */

export type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting'; message?: string }
  | { status: 'retrying'; attempt: number; maxAttempts: number; error: string; nextRetryMs: number }
  | { status: 'failed'; error: string }
  | { status: 'connected' };

/**
 * Reactive connection status state.
 * Components can read this to show retry indicators.
 */
export const connectionStatus: ConnectionState = $state({ status: 'idle' });

/**
 * Update connection status - call from retry logic.
 */
export function setConnectionStatus(state: ConnectionState): void {
  Object.assign(connectionStatus, state);
}

/**
 * Reset to idle state.
 */
export function resetConnectionStatus(): void {
  Object.assign(connectionStatus, { status: 'idle' });
}

/**
 * Mark as connecting (initial attempt).
 */
export function setConnecting(message?: string): void {
  Object.assign(connectionStatus, { status: 'connecting', message });
}

/**
 * Mark as retrying with attempt info.
 */
export function setRetrying(attempt: number, maxAttempts: number, error: string, nextRetryMs: number): void {
  Object.assign(connectionStatus, {
    status: 'retrying',
    attempt,
    maxAttempts,
    error,
    nextRetryMs,
  });
}

/**
 * Mark as failed (all retries exhausted).
 */
export function setFailed(error: string): void {
  Object.assign(connectionStatus, { status: 'failed', error });
}

/**
 * Mark as successfully connected.
 */
export function setConnected(): void {
  Object.assign(connectionStatus, { status: 'connected' });
}
