<script lang="ts">
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { Address } from '@aboutcircles/sdk-types';
    import {
        fetchTrusteeValidation,
        getCachedTrusteeValidation,
        type TrusteeValidationResponse,
    } from '$lib/shared/model/profile';

    interface Props {
        address: Address | undefined;
    }

    let { address }: Props = $props();

    let trustScoreAbortController: AbortController | null = null;
    let trustScoreFor: string | null = $state(null);
    let trustScoreLoading: boolean = $state(false);
    let trustScoreError: string | null = $state(null);
    let trustScoreSupported: boolean | null = $state(null);
    let gnosisTrustScore: number | null = $state(null);
    let overallDangerScore: number | null = $state(null);
    let trustScoreSummary: string = $state('');

    const formattedGnosisTrustScore = $derived.by(() => {
        const score = gnosisTrustScore;
        return score === null ? null : score.toFixed(1);
    });
    const formattedDangerScore = $derived.by(() => {
        const score = overallDangerScore;
        return score === null ? null : score.toFixed(2);
    });
    const trustScoreTitle = $derived.by(() => {
        const lines: string[] = [];
        if (trustScoreSummary) lines.push(trustScoreSummary);
        if (formattedDangerScore !== null) lines.push(`Risk details: danger ${formattedDangerScore}`);
        return lines.length > 0 ? lines.join('\n') : undefined;
    });

    function applyTrustScoreResponse(response: TrusteeValidationResponse): void {
        trustScoreSupported = response.supported ?? null;
        gnosisTrustScore =
            typeof response.gnosis_trust_score === 'number' ? response.gnosis_trust_score : null;
        overallDangerScore =
            typeof response.overall_danger_score === 'number' ? response.overall_danger_score : null;
        trustScoreSummary = response.summary ?? response.tldr ?? '';
        trustScoreError = null;
    }

    async function loadTrustScore(trusteeAddress: Address): Promise<void> {
        const normalizedTrustee = normalizeAddress(String(trusteeAddress)).toLowerCase();
        trustScoreFor = normalizedTrustee;

        const cached = getCachedTrusteeValidation(normalizedTrustee);
        if (cached) {
            applyTrustScoreResponse(cached);
            trustScoreLoading = false;
            return;
        }

        trustScoreLoading = true;
        trustScoreError = null;
        trustScoreSupported = null;
        gnosisTrustScore = null;
        overallDangerScore = null;
        trustScoreSummary = '';

        if (trustScoreAbortController) {
            trustScoreAbortController.abort();
        }

        const controller = new AbortController();
        trustScoreAbortController = controller;

        try {
            const result = await fetchTrusteeValidation(normalizedTrustee, {
                signal: controller.signal,
            });

            if (trustScoreFor !== normalizedTrustee) {
                return;
            }
            applyTrustScoreResponse(result);
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                return;
            }
            if (trustScoreFor === normalizedTrustee) {
                trustScoreError = error?.message ?? 'Failed to load trust score';
            }
        } finally {
            if (trustScoreFor === normalizedTrustee) {
                trustScoreLoading = false;
            }
        }
    }

    $effect(() => {
        if (!address) {
            if (trustScoreAbortController) {
                trustScoreAbortController.abort();
            }
            trustScoreFor = null;
            trustScoreLoading = false;
            trustScoreError = null;
            trustScoreSupported = null;
            gnosisTrustScore = null;
            overallDangerScore = null;
            trustScoreSummary = '';
            return;
        }

        const normalizedAddress = normalizeAddress(String(address)).toLowerCase();
        if (!trustScoreLoading && trustScoreFor !== normalizedAddress) {
            setTimeout(() => {
                if (address && normalizeAddress(String(address)).toLowerCase() === normalizedAddress) {
                    void loadTrustScore(address);
                }
            }, 0);
        }
    });
</script>

<div class="mt-1 h-6 flex items-center justify-center">
    {#if trustScoreLoading}
        <div class="h-4 w-40 rounded bg-base-200 animate-pulse" aria-hidden="true"></div>
    {:else if trustScoreError}
        <span class="text-xs text-base-content/55">Trust score unavailable</span>
    {:else if trustScoreSupported === false}
        <span class="text-xs text-base-content/60">Trust score not supported</span>
    {:else if formattedGnosisTrustScore !== null}
        <span class="text-xs text-base-content/70" title={trustScoreTitle}>
            Trust score: <span class="font-semibold text-base-content">{formattedGnosisTrustScore}</span>
        </span>
    {:else}
        <span class="text-xs text-base-content/45">&nbsp;</span>
    {/if}
</div>
