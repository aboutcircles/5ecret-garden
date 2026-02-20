import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
import type { TrustRelationKind } from '$lib/shared/types/sdk-augment';
import type { CirclesConfig } from '$lib/shared/config/circles';

export function getTypeString(type: string): string {
  const typeMap: Record<string, string> = {
    CrcV2_RegisterHuman: 'Human',
    CrcV2_RegisterGroup: 'Group',
    CrcV2_RegisterOrganization: 'Organization',
    CrcV1_Signup: 'Human (v1)',
  };
  return typeMap[type ?? ''] || 'None';
}

export function formatTrustRelation(relation: TrustRelationKind | string | undefined, profile?: Profile) {
  switch (relation) {
    case 'trusts':
      return `You accept ${profile ? profile.name + '’s' : 'their'} Circles`;
    case 'trustedBy':
      return profile ? `${profile.name} accepts your Circles` : 'They accept your Circles';
    case 'mutuallyTrusts':
      return 'You accept each other’s Circles';
    case 'selfTrusts':
      return 'Self-trusted';
    case 'variesByVersion':
      return 'Trust relationship varies by version';
    default:
      return "You don't trust each other";
  }
}

import { gnosisConfig, chiadoConfig } from '$lib/shared/config/circles';

export async function getCirclesConfig(chainId: bigint, rings: boolean) {
  let circlesConfig: CirclesConfig
  if (chainId === 100n) {
    circlesConfig = rings ? gnosisConfig.rings : gnosisConfig.production;
    return circlesConfig;
  } else if (chainId === 10200n) {
    circlesConfig = rings ? chiadoConfig.rings : chiadoConfig.production;
    return circlesConfig;
  }
  throw new Error(`Unsupported chain-id: ${chainId}`);
}
