import type { AvatarRow } from '@circles-sdk/data';

// For migrate-to-v2 we care about legacy (v1) avatar types.
// V1 organizations do not require invitation during migration.
const INVITATION_OPTIONAL_MIGRATION_TYPES = new Set<string>(['CrcV1_OrganizationSignup']);

export function migrationDoesNotRequireInvitation(avatar: Pick<AvatarRow, 'type'> | null | undefined): boolean {
  const type = avatar?.type;
  if (!type) return false;
  return INVITATION_OPTIONAL_MIGRATION_TYPES.has(type);
}

export function migrationCanStartAtProfile(
  avatar: Pick<AvatarRow, 'type'> | null | undefined,
  canSelfMigrate: boolean,
): boolean {
  return migrationDoesNotRequireInvitation(avatar) || canSelfMigrate;
}
