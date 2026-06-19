import { env } from '$env/dynamic/public';

/**
 * Base URL of the Circles wallet that hosts the referral-claim landing page.
 *
 * core-app only *creates* referral links — it has no `/referral/<key>` claim
 * route of its own (claiming needs the passkey/account-abstraction flow that
 * lives in the Gnosis wallet). Generated links therefore point at that wallet,
 * where a brand-new person redeems the pre-generated account.
 *
 * Overridable via `PUBLIC_INVITE_WALLET_BASE_URL` so staging can repoint.
 */
export const INVITE_WALLET_BASE_URL =
  env.PUBLIC_INVITE_WALLET_BASE_URL?.trim().replace(/\/+$/, '') ||
  'https://app.gnosis.io';

/**
 * Build the shareable invite link for a referral private key. Matches the
 * format the Gnosis wallet expects at `/referral/<key>`.
 */
export function buildReferralLink(privateKey: string): string {
  return `${INVITE_WALLET_BASE_URL}/referral/${privateKey}?utm_campaign=referral`;
}
