export interface TrusteeValidationResponse {
  validation_id?: string;
  overall_danger_score?: number;
  tldr?: string;
  summary?: string;
  supported?: boolean;
  gnosis_trust_score?: number;
}

const TRUST_SCORE_API_URL = 'https://safe-watch-api-prod.ai.gnosisdev.com/validate-trustee';
const trusteeValidationCache = new Map<string, TrusteeValidationResponse>();

function normalizeTrusteeAddress(trustee: string): string {
  return String(trustee).trim().toLowerCase();
}

export function getCachedTrusteeValidation(trustee: string): TrusteeValidationResponse | undefined {
  return trusteeValidationCache.get(normalizeTrusteeAddress(trustee));
}

export async function fetchTrusteeValidation(
  trustee: string,
  options?: { signal?: AbortSignal; force?: boolean },
): Promise<TrusteeValidationResponse> {
  const normalizedTrustee = normalizeTrusteeAddress(trustee);
  const cached = trusteeValidationCache.get(normalizedTrustee);
  if (cached && !options?.force) {
    return cached;
  }

  const response = await fetch(TRUST_SCORE_API_URL, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ trustee: normalizedTrustee }),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Trust score request failed (${response.status})`);
  }

  const result = (await response.json()) as TrusteeValidationResponse;
  trusteeValidationCache.set(normalizedTrustee, result);
  return result;
}

export function clearTrusteeValidationCache(trustee?: string): void {
  if (trustee) {
    trusteeValidationCache.delete(normalizeTrusteeAddress(trustee));
    return;
  }
  trusteeValidationCache.clear();
}
