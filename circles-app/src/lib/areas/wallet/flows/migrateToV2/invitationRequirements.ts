// For migrate-to-v2 we care about legacy (v1) avatar types.
// V1 organizations do not require invitation during migration.
// Note: CrcV1_OrganizationSignup is not in the new SDK's AvatarType union,
// so we accept string for backward compatibility with legacy registrations.
const INVITATION_OPTIONAL_MIGRATION_TYPES = new Set<string>(['CrcV1_OrganizationSignup']);

export function migrationDoesNotRequireInvitation(avatar: { type?: string } | null | undefined): boolean {
  const type = avatar?.type;
  if (!type) return false;
  return INVITATION_OPTIONAL_MIGRATION_TYPES.has(type);
}

export function migrationCanStartAtProfile(
  avatar: { type?: string } | null | undefined,
  canSelfMigrate: boolean,
): boolean {
  return migrationDoesNotRequireInvitation(avatar) || canSelfMigrate;
}
