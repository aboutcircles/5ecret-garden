export const DB_NAME = 'circles-wallet';
export const DB_VERSION = 1;

/** Profiles older than this are considered stale and re-fetched from RPC. */
export const PROFILE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Max transaction rows kept per account scope. */
export const TX_RETENTION_LIMIT = 200;
