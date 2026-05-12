import { describe, expect, it } from 'vitest';
import {
  migrationCanStartAtProfile,
  migrationDoesNotRequireInvitation,
} from '$lib/areas/wallet/flows/migrateToV2/invitationRequirements';
import type { AvatarRow } from '@circles-sdk/data';

describe('migrationDoesNotRequireInvitation', () => {
  it('returns true for v1 organizations', () => {
    expect(
      migrationDoesNotRequireInvitation({
        type: 'CrcV1_OrganizationSignup',
      } as Pick<AvatarRow, 'type'>)
    ).toBe(true);
  });

  it('returns false for v2 organizations', () => {
    expect(
      migrationDoesNotRequireInvitation({
        type: 'CrcV2_RegisterOrganization',
      } as Pick<AvatarRow, 'type'>)
    ).toBe(false);
  });

  it('returns false for humans', () => {
    expect(
      migrationDoesNotRequireInvitation({
        type: 'CrcV1_Signup',
      } as Pick<AvatarRow, 'type'>)
    ).toBe(false);
  });

  it('returns false when avatar/type is missing', () => {
    expect(migrationDoesNotRequireInvitation(undefined)).toBe(false);
    expect(migrationDoesNotRequireInvitation(null)).toBe(false);
  });

  it('starts at profile when self-migration is available', () => {
    expect(
      migrationCanStartAtProfile(
        {
          type: 'CrcV1_Signup',
        } as Pick<AvatarRow, 'type'>,
        true,
      ),
    ).toBe(true);
  });

  it('does not start at profile when invitation is required and self-migration is unavailable', () => {
    expect(
      migrationCanStartAtProfile(
        {
          type: 'CrcV1_Signup',
        } as Pick<AvatarRow, 'type'>,
        false,
      ),
    ).toBe(false);
  });
});
