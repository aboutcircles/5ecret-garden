import { describe, expect, it } from 'vitest';
import { AdminApiError, describeAdminError } from '$lib/areas/admin/services/gateway/adminClient';

/**
 * The admin page shows API failures inline (per section) rather than routing them
 * through the global runTask error popup, which would dump a raw
 * "METHOD /path failed (status): body" message + a minified stack trace. These are
 * the expected, common failures — an admin token that's valid but not on the
 * allowlist (403), an expired session (401), or an endpoint the deployment lacks
 * (404) — so each must map to a short, human message.
 */
describe('describeAdminError', () => {
  const err = (status: number) => new AdminApiError('GET', '/admin/routes', status, '');

  it('maps 403 to a "not on the allowlist" message (not the raw error)', () => {
    const msg = describeAdminError(err(403));
    expect(msg).toBe("This wallet isn't on the admin allowlist for the selected market API.");
    expect(msg).not.toContain('/admin/routes');
  });

  it('maps 401 to an expired-session message', () => {
    expect(describeAdminError(err(401))).toBe(
      'Your admin session has expired. Please sign in again.',
    );
  });

  it('maps 404 to a feature-not-available message', () => {
    expect(describeAdminError(err(404))).toBe(
      "This admin feature isn't available on the selected server.",
    );
  });

  it('gives a generic status message for other AdminApiError codes', () => {
    expect(describeAdminError(err(500))).toBe('Admin request failed (500).');
  });

  it('falls back to the message for a plain Error', () => {
    expect(describeAdminError(new Error('boom'))).toBe('boom');
  });

  it('stringifies non-Error throwables', () => {
    expect(describeAdminError('nope')).toBe('nope');
  });
});
