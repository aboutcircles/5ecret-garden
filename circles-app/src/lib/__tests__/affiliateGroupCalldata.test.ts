import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';
import {
  encodeAffiliateGroupCall,
  affiliateRegistryInterface,
} from '$lib/areas/groups/utils/affiliateGroupCalldata';

const GROUP = '0xDe6c6ECB280C6fA535000F2d5BBb8DFdF460D161' as Address;

describe('encodeAffiliateGroupCall', () => {
  it('encodes addAffiliateGroup with the right selector and a lowercased address arg', () => {
    const data = encodeAffiliateGroupCall('addAffiliateGroup', GROUP);
    expect(data.slice(0, 10)).toBe(ethers.id('addAffiliateGroup(address)').slice(0, 10));
    const [decoded] = ethers.AbiCoder.defaultAbiCoder().decode(['address'], '0x' + data.slice(10));
    expect((decoded as string).toLowerCase()).toBe(GROUP.toLowerCase());
  });

  it('encodes removeAffiliateGroup with the right selector', () => {
    const data = encodeAffiliateGroupCall('removeAffiliateGroup', GROUP);
    expect(data.slice(0, 10)).toBe(ethers.id('removeAffiliateGroup(address)').slice(0, 10));
  });

  it('decodes the registry custom errors used for friendly messages', () => {
    const onlyHuman = affiliateRegistryInterface.encodeErrorResult('OnlyHuman', []);
    expect(affiliateRegistryInterface.parseError(onlyHuman)?.name).toBe('OnlyHuman');

    const notExist = affiliateRegistryInterface.encodeErrorResult('AffiliateGroupNotExist', [GROUP.toLowerCase()]);
    expect(affiliateRegistryInterface.parseError(notExist)?.name).toBe('AffiliateGroupNotExist');
  });
});
