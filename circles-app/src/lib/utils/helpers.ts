import type { Profile } from '@circles-sdk/profiles';
import type { TrustRelationRow } from '@circles-sdk/data';

export function getTypeString(type: string): string {
  const typeMap: Record<string, string> = {
    'CrcV2_RegisterHuman': 'Human',
    'CrcV2_RegisterGroup': 'Group',
    'CrcV2_RegisterOrganization': 'Organization',
    'CrcV1_Signup': 'Human (v1)',
  };
  return typeMap[type ?? ''] || '';
}


//TODO: DRY

export function getRelationText(row: TrustRelationRow, profile?: Profile): string {
  if (!row) return `You don't trust each other`;

  const relationMap: Record<string, string> = {
    'mutuallyTrusts': `You accept each other's tokens`,
    'trustedBy': `${profile?.name} accepts your tokens`,
    'trusts': `You accept ${profile?.name}'s tokens`,
  };

  return relationMap[row.relation] || `Unknown relation: ${row.relation}`;
}

export function formatTrustRelation(row: TrustRelationRow) {
  switch (row.relation) {
    case 'trusts':
      return 'You accept their tokens';
    case 'trustedBy':
      return 'They accept your tokens';
    case 'mutuallyTrusts':
      return 'You accept each other’s tokens';
    case 'selfTrusts':
      return 'Self-trusted';
    case 'variesByVersion':
      return 'Trust relationship varies by version';
    default:
      return row.relation;
  }
}
