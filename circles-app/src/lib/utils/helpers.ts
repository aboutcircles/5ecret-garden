import type { Profile } from '@circles-sdk/profiles';
import type { ExtendedTrustRelationRow } from '$lib/stores/contacts';

export function getTypeString(type: string): string {
  const typeMap: Record<string, string> = {
    'CrcV2_RegisterHuman': 'Human',
    'CrcV2_RegisterGroup': 'Group',
    'CrcV2_RegisterOrganization': 'Organization',
    'CrcV1_Signup': 'Human (v1)',
  };
  return typeMap[type ?? ''] || '';
}

export function getRelationText(row: ExtendedTrustRelationRow, profile?: Profile): string {
  if (!row) return `You don't trust each other`;

  const relationMap: Record<string, string> = {
    'mutuallyTrusts': `You accept each other's tokens`,
    'trustedBy': `${profile?.name} accepts your tokens`,
    'trusts': `You accept ${profile?.name}'s tokens`,
  };

  return relationMap[row.relation] || `Unknown relation: ${row.relation}`;
}
