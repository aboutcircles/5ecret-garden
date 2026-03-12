import { describe, it, expect, vi } from 'vitest';
import {
  isHumanAvatar,
  isGroupAvatar,
  isOrganisationAvatar,
  isHumanType,
  isGroupType,
  isOrganizationType,
  getAvatarCategory,
  getCategoryFromType,
} from '$lib/shared/utils/avatarHelpers';
import type { Avatar } from '@aboutcircles/sdk';
import type { AvatarRow, AvatarType } from '@aboutcircles/sdk-types';

// Mock avatar factory for testing
function createMockAvatar(type: string): Avatar {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  return {
    address: mockAddress,
    avatarInfo: {
      avatar: mockAddress,
      address: mockAddress,
      version: 2,
      type: type as AvatarType,
    } as AvatarRow,
    events: {
      subscribe: vi.fn(),
    },
    subscribeToEvents: vi.fn(),
    trust: {
      add: vi.fn(),
      remove: vi.fn(),
      isTrusting: vi.fn(),
      isTrustedBy: vi.fn(),
      getAll: vi.fn(),
    },
    balances: {
      getTotal: vi.fn(),
      getTokenBalances: vi.fn(),
      getTotalSupply: vi.fn(),
    },
    profile: {
      get: vi.fn(),
      update: vi.fn(),
      updateMetadata: vi.fn(),
      registerShortName: vi.fn(),
    },
    history: {
      getTransactions: vi.fn(),
    },
    transfer: {
      direct: vi.fn(),
      advanced: vi.fn(),
      getMaxAmount: vi.fn(),
      getMaxAmountAdvanced: vi.fn(),
    },
    wrap: {
      asDemurraged: vi.fn(),
      asInflationary: vi.fn(),
      unwrapDemurraged: vi.fn(),
      unwrapInflationary: vi.fn(),
    },
    unsubscribeFromEvents: vi.fn(),
  } as unknown as Avatar;
}

describe('avatarHelpers', () => {
  describe('isHumanType', () => {
    it('should return true for CrcV2_RegisterHuman', () => {
      expect(isHumanType('CrcV2_RegisterHuman')).toBe(true);
    });

    it('should return true for CrcV1_Signup', () => {
      expect(isHumanType('CrcV1_Signup')).toBe(true);
    });

    it('should return false for group type', () => {
      expect(isHumanType('CrcV2_RegisterGroup')).toBe(false);
    });

    it('should return false for organization type', () => {
      expect(isHumanType('CrcV2_RegisterOrganization')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isHumanType(undefined)).toBe(false);
    });
  });

  describe('isGroupType', () => {
    it('should return true for CrcV2_RegisterGroup', () => {
      expect(isGroupType('CrcV2_RegisterGroup')).toBe(true);
    });

    it('should return false for human type', () => {
      expect(isGroupType('CrcV2_RegisterHuman')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isGroupType(undefined)).toBe(false);
    });
  });

  describe('isOrganizationType', () => {
    it('should return true for CrcV2_RegisterOrganization', () => {
      expect(isOrganizationType('CrcV2_RegisterOrganization')).toBe(true);
    });

    it('should return false for human type', () => {
      expect(isOrganizationType('CrcV2_RegisterHuman')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOrganizationType(undefined)).toBe(false);
    });
  });

  describe('isHumanAvatar', () => {
    it('should return true for human avatar with CrcV2_RegisterHuman', () => {
      const avatar = createMockAvatar('CrcV2_RegisterHuman');
      expect(isHumanAvatar(avatar)).toBe(true);
    });

    it('should return true for human avatar with CrcV1_Signup', () => {
      const avatar = createMockAvatar('CrcV1_Signup');
      expect(isHumanAvatar(avatar)).toBe(true);
    });

    it('should return false for group avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterGroup');
      expect(isHumanAvatar(avatar)).toBe(false);
    });

    it('should return false for organization avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterOrganization');
      expect(isHumanAvatar(avatar)).toBe(false);
    });
  });

  describe('isGroupAvatar', () => {
    it('should return true for group avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterGroup');
      expect(isGroupAvatar(avatar)).toBe(true);
    });

    it('should return false for human avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterHuman');
      expect(isGroupAvatar(avatar)).toBe(false);
    });
  });

  describe('isOrganisationAvatar', () => {
    it('should return true for organization avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterOrganization');
      expect(isOrganisationAvatar(avatar)).toBe(true);
    });

    it('should return false for human avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterHuman');
      expect(isOrganisationAvatar(avatar)).toBe(false);
    });
  });

  describe('getAvatarCategory', () => {
    it('should return "human" for human avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterHuman');
      expect(getAvatarCategory(avatar)).toBe('human');
    });

    it('should return "group" for group avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterGroup');
      expect(getAvatarCategory(avatar)).toBe('group');
    });

    it('should return "organization" for organization avatar', () => {
      const avatar = createMockAvatar('CrcV2_RegisterOrganization');
      expect(getAvatarCategory(avatar)).toBe('organization');
    });

    it('should return "unknown" for unknown type', () => {
      const avatar = createMockAvatar('UnknownType');
      expect(getAvatarCategory(avatar)).toBe('unknown');
    });
  });

  describe('getCategoryFromType', () => {
    it('should return "human" for human types', () => {
      expect(getCategoryFromType('CrcV2_RegisterHuman')).toBe('human');
      expect(getCategoryFromType('CrcV1_Signup')).toBe('human');
    });

    it('should return "group" for group type', () => {
      expect(getCategoryFromType('CrcV2_RegisterGroup')).toBe('group');
    });

    it('should return "organization" for organization type', () => {
      expect(getCategoryFromType('CrcV2_RegisterOrganization')).toBe('organization');
    });

    it('should return "unknown" for undefined', () => {
      expect(getCategoryFromType(undefined)).toBe('unknown');
    });
  });
});
