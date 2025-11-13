import type { Profile } from '@aboutcircles/sdk-types';
import type { TrustRelationType } from '@aboutcircles/sdk-types';
import type { CirclesConfig } from '@aboutcircles/sdk-types';

export function getTypeString(type: string): string {
  const typeMap: Record<string, string> = {
    CrcV2_RegisterHuman: 'Human',
    CrcV2_RegisterGroup: 'Group',
    CrcV2_RegisterOrganization: 'Organization',
    CrcV1_Signup: 'Human (v1)',
  };
  return typeMap[type ?? ''] || 'None';
}

export function formatTrustRelation(
  relation: TrustRelationType | undefined,
  profile?: Profile
) {
  switch (relation) {
    case 'trusts':
      return `You accept ${profile ? profile.name + '\'s' : 'their'} tokens`;
    case 'trustedBy':
      return `${profile ? profile.name : 'They'} accept your tokens`;
    case 'mutuallyTrusts':
      return 'You accept each other\'s tokens';
    default:
      return "You don't trust each other";
  }
}

export async function getCirclesConfig(chainId: bigint, rings: boolean) {
  let circlesConfig: CirclesConfig;
  if (chainId === 100n) {
    rings
      ? (circlesConfig = (await import('$lib/circlesConfig')).gnosisConfig
          .rings)
      : (circlesConfig = (await import('$lib/circlesConfig')).gnosisConfig
          .production);
    return circlesConfig;
  } else if (chainId === 10200n) {
    rings
      ? (circlesConfig = (await import('$lib/circlesConfig')).chiadoConfig
          .rings)
      : (circlesConfig = (await import('$lib/circlesConfig')).chiadoConfig
          .production);
    return circlesConfig;
  }
  throw new Error(`Unsupported chain-id: ${chainId}`);
}
