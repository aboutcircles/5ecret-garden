/**
 * Type augmentation for @aboutcircles/sdk-types
 *
 * The new SDK has simplified types (e.g. TokenBalanceRow only has tokenAddress + balance).
 * The refactor branch UI code uses the old SDK's richer type shapes extensively.
 * This augmentation extends the new SDK types with backward-compatible properties
 * so the UI code works without massive rewrites.
 *
 * The data proxy layer (shared/data/circles/) populates these extra fields
 * when returning data from the SDK.
 */
import type { Address } from '@aboutcircles/sdk-types';

declare module '@aboutcircles/sdk-types' {
  interface TokenBalanceRow {
    /** Token owner address */
    tokenOwner?: Address;
    /** Token type string (e.g. 'CrcV2_RegisterHuman', 'CrcV1_Signup') */
    tokenType?: string;
    /** Human-readable balance in CRC */
    circles?: number;
    /** Static (time-adjusted) balance */
    staticCircles?: number;
    /** Atto-scale balance (bigint as string) */
    attoCircles?: string;
    /** Static atto-scale balance */
    staticAttoCircles?: string;
    /** Whether this is an ERC20 token */
    isErc20?: boolean;
    /** Whether this is a wrapped token */
    isWrapped?: boolean;
    /** Token ID (uint256) */
    tokenId?: string;
    /** Circles version (1 or 2) */
    version?: number;
    /** Block number of the balance event */
    blockNumber?: number;
    /** Transaction index */
    transactionIndex?: number;
    /** Log index */
    logIndex?: number;
  }

  interface TrustRelationRow {
    /** Trust relation type */
    relation?: TrustRelationKind;
    /** The other avatar in the trust relation */
    objectAvatar?: Address;
    /** Subject avatar */
    subjectAvatar?: Address;
    /** Limit (for trust amounts) */
    limit?: number;
  }

  interface AvatarRow {
    /** Whether avatar's v1 token is stopped */
    v1Stopped?: boolean;
    /** V1 token address (for migrated avatars) */
    v1Token?: Address;
    /** Token ID */
    tokenId?: string;
    /** Profile CID v0 (also available as cidV0) */
    profileCid?: string;
    /** Signup timestamp */
    signupTimestamp?: number;
    /** Block number */
    blockNumber?: number;
    /** Transaction index */
    transactionIndex?: number;
    /** Log index */
    logIndex?: number;
  }
}

/** Trust relation kind (old SDK compatibility, superset of SDK's TrustRelationType) */
export type TrustRelationKind =
  | 'trusts'
  | 'trustedBy'
  | 'mutuallyTrusts'
  | 'selfTrusts'
  | 'variesByVersion'
  | 'untrusted';
