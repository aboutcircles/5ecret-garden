/**
 * Type guards and helper functions for working with Avatar types
 * Eliminates the need for `as any` casts when accessing avatar-specific methods
 */

import type { Avatar, HumanAvatar, BaseGroupAvatar, OrganisationAvatar, Sdk } from '@aboutcircles/sdk';
import type { AvatarRow } from '@aboutcircles/sdk-types';

/**
 * Avatar type string literals from Circles protocol
 * These correspond to the registration events in the Circles V1/V2 contracts
 */
export type AvatarType =
  | 'CrcV1_Signup'
  | 'CrcV2_RegisterHuman'
  | 'CrcV2_RegisterGroup'
  | 'CrcV2_RegisterOrganization';

/**
 * Check if an avatar is a HumanAvatar
 * HumanAvatars have access to personalToken minting and group membership methods
 */
export function isHumanAvatar(avatar: Avatar): avatar is HumanAvatar {
  const type = avatar.avatarInfo?.type;
  return type === 'CrcV2_RegisterHuman' || type === 'CrcV1_Signup';
}

/**
 * Check if an avatar is a BaseGroupAvatar
 * GroupAvatars have access to group-specific methods like mint policy management
 */
export function isGroupAvatar(avatar: Avatar): avatar is BaseGroupAvatar {
  return avatar.avatarInfo?.type === 'CrcV2_RegisterGroup';
}

/**
 * Check if an avatar is an OrganisationAvatar
 * OrganisationAvatars can participate in Circles without personal token minting
 */
export function isOrganisationAvatar(avatar: Avatar): avatar is OrganisationAvatar {
  return avatar.avatarInfo?.type === 'CrcV2_RegisterOrganization';
}

/**
 * Get the SDK reference from an avatar
 * Avatars created via Sdk.getAvatar() have an SDK reference for RPC access
 *
 * @param avatar - The avatar instance
 * @returns The SDK reference or undefined if not available
 */
export function getSdkFromAvatar(avatar: Avatar): Sdk | undefined {
  try {
    // Access the sdk property - CommonAvatar has a getter that throws if not set
    const sdk = (avatar as any).sdk;
    return sdk as unknown as Sdk;
  } catch {
    // Avatar was not created via Sdk.getAvatar()
    return undefined;
  }
}

/**
 * Determine the avatar type from an AvatarRow or avatarInfo
 */
export function getAvatarType(avatarInfo: AvatarRow | undefined): AvatarType | undefined {
  const type = avatarInfo?.type;
  // Cast to AvatarType if it matches one of the known types
  if (type && (type === 'CrcV1_Signup' || type === 'CrcV2_RegisterHuman' ||
      type === 'CrcV2_RegisterGroup' || type === 'CrcV2_RegisterOrganization')) {
    return type as AvatarType;
  }
  return undefined;
}

/**
 * Check if the avatar type indicates a human
 */
export function isHumanType(type: AvatarType | string | undefined): boolean {
  return type === 'CrcV2_RegisterHuman' || type === 'CrcV1_Signup';
}

/**
 * Check if the avatar type indicates a group
 */
export function isGroupType(type: AvatarType | string | undefined): boolean {
  return type === 'CrcV2_RegisterGroup';
}

/**
 * Check if the avatar type indicates an organization
 */
export function isOrganizationType(type: AvatarType | string | undefined): boolean {
  return type === 'CrcV2_RegisterOrganization';
}

/**
 * Avatar category for UI purposes
 */
export type AvatarCategory = 'human' | 'group' | 'organization' | 'unknown';

/**
 * Get the category of an avatar for UI display purposes
 */
export function getAvatarCategory(avatar: Avatar): AvatarCategory {
  if (isHumanAvatar(avatar)) return 'human';
  if (isGroupAvatar(avatar)) return 'group';
  if (isOrganisationAvatar(avatar)) return 'organization';
  return 'unknown';
}

/**
 * Get the category from an avatar type string
 */
export function getCategoryFromType(type: AvatarType | string | undefined): AvatarCategory {
  if (isHumanType(type)) return 'human';
  if (isGroupType(type)) return 'group';
  if (isOrganizationType(type)) return 'organization';
  return 'unknown';
}
