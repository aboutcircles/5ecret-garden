/**
 * SDK Adapters - Type-safe conversion functions for SDK data formats
 * Provides adapters between different SDK versions and internal formats
 */

import type { AggregatedTrustRelation, Profile, TrustRelationInfo, Address } from '@aboutcircles/sdk-types';

/**
 * Extended trust relation that includes V2 compatibility fields.
 * Used to maintain backward compatibility with components expecting
 * the older SDK format with version arrays.
 */
export interface ExtendedTrustRelation extends AggregatedTrustRelation {
  versions: number[];
  versionSpecificRelations: Record<number, string>;
}

/**
 * Adapt a trust relation from the new SDK format to include V2 compatibility fields.
 * The new SDK only works with V2, so we add the version metadata accordingly.
 *
 * @param relation - Trust relation from SDK's trust.getAll() or getAggregatedTrustRelationsEnriched()
 * @returns Extended relation with versions array and versionSpecificRelations map
 */
export function adaptTrustRelationForV2(
  relation: AggregatedTrustRelation
): ExtendedTrustRelation {
  return {
    ...relation,
    versions: [2],
    versionSpecificRelations: { 2: relation.relation },
  };
}

/**
 * Adapt multiple trust relations for V2 compatibility.
 *
 * @param relations - Array of trust relations from SDK
 * @returns Array of extended relations with version metadata
 */
export function adaptTrustRelationsForV2(
  relations: AggregatedTrustRelation[]
): ExtendedTrustRelation[] {
  return relations.map(adaptTrustRelationForV2);
}

/**
 * Type guard to check if a value is a valid Profile object.
 * Used for runtime validation of RPC responses.
 */
export function isValidProfile(value: unknown): value is Profile {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== 'object') {
    return false;
  }
  // Profile can have optional fields, but must be an object
  // with string properties if present
  const obj = value as Record<string, unknown>;
  if (obj.name !== undefined && typeof obj.name !== 'string') {
    return false;
  }
  if (obj.previewImageUrl !== undefined && typeof obj.previewImageUrl !== 'string') {
    return false;
  }
  return true;
}

/**
 * Validate and filter an array of profile results from batch RPC calls.
 * Invalid entries are filtered out rather than causing errors.
 *
 * @param results - Raw results from circles_getProfileByCidBatch RPC call
 * @returns Array of validated profiles (invalid entries replaced with undefined)
 */
export function validateProfileBatchResults(
  results: unknown[]
): (Profile | undefined)[] {
  return results.map((result) => {
    if (isValidProfile(result)) {
      return result;
    }
    return undefined;
  });
}

/**
 * Safely extract an error message from an unknown error value.
 * Centralizes the error message extraction pattern used across stores.
 *
 * @param error - Any caught error value
 * @returns String message suitable for display or logging
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Relation type for the enriched trust relations response categories.
 */
export type TrustRelationType = 'trusts' | 'trustedBy' | 'mutuallyTrusts';

/**
 * Convert a TrustRelationInfo from the enriched endpoint to AggregatedTrustRelation format.
 * This allows using the enriched endpoint (single RPC call) while maintaining
 * compatibility with existing components expecting AggregatedTrustRelation.
 *
 * @param info - TrustRelationInfo from getAggregatedTrustRelationsEnriched
 * @param relationType - The category this relation came from ('trusts', 'trustedBy', 'mutuallyTrusts')
 * @param subjectAvatar - The avatar address that was queried
 * @returns AggregatedTrustRelation compatible object
 */
export function adaptTrustRelationInfoToAggregated(
  info: TrustRelationInfo,
  relationType: TrustRelationType,
  subjectAvatar: Address
): AggregatedTrustRelation {
  return {
    subjectAvatar,
    objectAvatar: info.address,
    relation: relationType,
    timestamp: Date.now(), // Use current time as fallback since enriched response may not include timestamp
  };
}

/**
 * Convert multiple TrustRelationInfo entries with their relation type.
 *
 * @param infos - Array of TrustRelationInfo
 * @param relationType - The relation type for all entries
 * @param subjectAvatar - The avatar address that was queried
 * @returns Array of AggregatedTrustRelation
 */
export function adaptTrustRelationInfosToAggregated(
  infos: TrustRelationInfo[],
  relationType: TrustRelationType,
  subjectAvatar: Address
): AggregatedTrustRelation[] {
  const timestamp = Date.now();
  return infos.map((info) => ({
    subjectAvatar,
    objectAvatar: info.address,
    relation: relationType,
    timestamp,
  }));
}
