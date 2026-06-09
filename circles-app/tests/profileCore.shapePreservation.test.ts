import { describe, expect, it } from 'vitest';
import { ensureProfileShape, loadProfileOrInit } from '@circles-market/sdk';
import type { ProfilesBindings } from '@circles-market/sdk';

const FIXTURE = {
  '@type': 'Profile',
  name: 'Test Group',
  description: 'A description',
  externalLinks: { website: 'https://example.org' },
  groupType: 'closed' as const,
  membershipCriteria: {
    minRepScore: 10,
    membershipFee: 2.5,
    additionalCriteria: ['Active 3+ months', 'Trusted by 5+ members'],
  },
  contactInfo: {
    email: 'hi@example.org',
    website: 'https://contact.example.org',
  },
};

describe('ensureProfileShape: preserves new nested group-profile fields', () => {
  it('does not strip externalLinks / groupType / membershipCriteria / contactInfo', () => {
    const shaped = ensureProfileShape({ ...FIXTURE });
    expect(shaped.externalLinks).toEqual(FIXTURE.externalLinks);
    expect(shaped.groupType).toBe(FIXTURE.groupType);
    expect(shaped.membershipCriteria).toEqual(FIXTURE.membershipCriteria);
    expect(shaped.contactInfo).toEqual(FIXTURE.contactInfo);
  });

  it('still adds @type / @context / namespaces / signingKeys when missing', () => {
    const shaped = ensureProfileShape({ name: 'x' });
    expect(shaped['@type']).toBe('Profile');
    expect(typeof shaped['@context']).toBe('string');
    expect(shaped.namespaces).toEqual({});
    expect(shaped.signingKeys).toEqual({});
  });
});

describe('loadProfileOrInit: returns raw new fields from the wide read path', () => {
  function stubBindings(rawProfile: any, cid: string | null): ProfilesBindings {
    return {
      putJsonLd: async () => 'unused-cid',
      getJsonLd: async (id) => {
        if (id !== cid) throw new Error(`unexpected cid: ${id}`);
        return rawProfile;
      },
      getLatestProfileCid: async () => cid,
      updateAvatarProfileDigest: async () => undefined,
    };
  }

  it('round-trips all seven new fields through the bindings → ensureProfileShape pipeline', async () => {
    const bindings = stubBindings({ ...FIXTURE }, 'cid-1');
    const { profile, profileCid } = await loadProfileOrInit(bindings, '0x' + '1'.repeat(40));
    expect(profileCid).toBe('cid-1');
    expect(profile.externalLinks).toEqual(FIXTURE.externalLinks);
    expect(profile.groupType).toBe(FIXTURE.groupType);
    expect(profile.membershipCriteria).toEqual(FIXTURE.membershipCriteria);
    expect(profile.contactInfo).toEqual(FIXTURE.contactInfo);
  });

  it('returns an empty initialized profile when there is no CID for the avatar', async () => {
    const bindings = stubBindings(null, null);
    const { profile, profileCid } = await loadProfileOrInit(bindings, '0x' + '2'.repeat(40));
    expect(profileCid).toBeNull();
    expect(profile.externalLinks).toBeUndefined();
    expect(profile.groupType).toBeUndefined();
    expect(profile.membershipCriteria).toBeUndefined();
    expect(profile.contactInfo).toBeUndefined();
  });
});
