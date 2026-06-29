import { ethers } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';

/**
 * MultiAffiliateGroupRegistry write ABI plus its decodable custom errors. Kept in
 * a store-free module so the calldata encoding is unit-testable without pulling in
 * the wallet/SDK state modules.
 */
export const affiliateRegistryInterface = new ethers.Interface([
  'function addAffiliateGroup(address affiliateGroupToAdd) external',
  'function removeAffiliateGroup(address affiliateGroupToRemove) external',
  'error OnlyHuman()',
  'error AffiliateGroupNotExist(address affiliateGroup)',
  'error SenderNotDeployer()',
]);

/** ABI-encode an `addAffiliateGroup`/`removeAffiliateGroup` call for `group`. */
export function encodeAffiliateGroupCall(
  method: 'addAffiliateGroup' | 'removeAffiliateGroup',
  group: Address
): string {
  return affiliateRegistryInterface.encodeFunctionData(method, [group.toLowerCase()]);
}
