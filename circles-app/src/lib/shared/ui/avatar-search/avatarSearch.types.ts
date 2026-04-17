import type { EventRow } from '@aboutcircles/sdk-types';

export type TrustRelationLike =
  | 'mutuallyTrusts'
  | 'trusts'
  | 'trustedBy'
  | 'variesByVersion'
  | string
  | undefined;

export interface AvatarSearchItem extends EventRow {
  key: string;
  address: string;
  name?: string;
  avatarType?: string;
  avatarVersion?: number;
  hasProfile: boolean;
  isContact: boolean;
  isBookmarked: boolean;
  isVipBookmarked: boolean;
  trustRelation?: TrustRelationLike;
  localRank: number;
  remoteRank: number;
}
