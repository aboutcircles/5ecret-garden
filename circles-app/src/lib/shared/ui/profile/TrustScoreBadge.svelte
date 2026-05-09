<script lang="ts">
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { Address } from '@circles-sdk/utils';
    import {
        fetchTrusteeValidation,
        getCachedTrusteeValidation,
        type TrusteeValidationResponse,
    } from '$lib/shared/model/profile';
    import { T } from '$lib/design-system/tokens.js';

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

    const formattedGnosisTrustScore = $derived(
        gnosisTrustScore === null ? null : gnosisTrustScore.toFixed(1)
    );
    const formattedDangerScore = $derived(
        overallDangerScore === null ? null : overallDangerScore.toFixed(2)
    );
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

<div style="margin-top:4px;height:24px;display:flex;align-items:center;justify-content:center;">
    {#if trustScoreLoading}
        <div class="trustscore-pulse" style="height:16px;width:160px;border-radius:4px;background:{T.pageDeep};" aria-hidden="true"></div>
    {:else if trustScoreError}
        <span style="font-size:12px;color:{T.inkSubtle};">Trust score unavailable</span>
    {:else if trustScoreSupported === false}
        <span style="font-size:12px;color:{T.inkMuted};">Trust score not supported</span>
    {:else if formattedGnosisTrustScore !== null}
        <span style="font-size:12px;color:{T.inkMuted};" title={trustScoreTitle}>
            Trust score: <span style="font-weight:600;color:{T.ink};">{formattedGnosisTrustScore}</span>
        </span>
    {:else}
        <span style="font-size:12px;color:{T.inkFaint};">&nbsp;</span>
    {/if}
</div>

<style>
  @keyframes trustscore-pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  .trustscore-pulse { animation: trustscore-pulse 1.5s ease-in-out infinite; }
</style>
