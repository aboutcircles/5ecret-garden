<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { getAggregatedTrustRelationsEnriched } from '$lib/utils/sdkHelpers';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { ArrowLeftRight, ArrowRight, ArrowLeft, RefreshCw, AlertCircle } from 'lucide';
  import type { Sdk } from '@aboutcircles/sdk';
  import type { Address } from '@aboutcircles/sdk-types';

  // Trust relation from SDK
  type TrustRelation = {
    address: Address;
    name?: string;
    previewImageUrl?: string;
  };

  type TrustData = {
    mutual: TrustRelation[];
    trusts: TrustRelation[]; // People I trust (but who don't trust me)
    trustedBy: TrustRelation[]; // People who trust me (but I don't trust)
  };

  let trustData = $state<TrustData | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Load trust relations when avatar is available
  $effect(() => {
    const sdk = $circles;
    const avatar = avatarState.avatar;

    console.log('[TrustEventsPanel] Effect triggered:', { sdk: !!sdk, avatar: avatar?.address });

    if (!sdk || !avatar?.address) {
      console.log('[TrustEventsPanel] Missing SDK or avatar, waiting...');
      // Keep loading state while waiting for dependencies
      // Don't set isLoading=false or trustData=null here
      return;
    }

    loadTrustRelations(sdk as Sdk, avatar.address as Address);
  });

  async function loadTrustRelations(sdk: Sdk, address: Address) {
    isLoading = true;
    error = null;

    try {
      const response = await getAggregatedTrustRelationsEnriched(sdk, address);
      console.log('[TrustEventsPanel] Raw SDK response:', response);

      // SDK returns mutual, trusts, trustedBy
      let mutual = response.mutual || [];
      let trusts = response.trusts || [];
      let trustedBy = response.trustedBy || [];

      const enrichedTotal = mutual.length + trusts.length + trustedBy.length;

      // Fallback to avatar.trust.getAll() if enriched returns empty (known backend bug)
      if (enrichedTotal === 0 && avatarState.avatar?.trust?.getAll) {
        console.log('[TrustEventsPanel] Enriched returned 0, using avatar.trust.getAll() fallback...');
        try {
          const allRelations = await avatarState.avatar.trust.getAll();
          console.log('[TrustEventsPanel] Fallback returned:', allRelations?.length ?? 0);

          if (allRelations && allRelations.length > 0) {
            // Group relations by type
            mutual = [];
            trusts = [];
            trustedBy = [];

            for (const rel of allRelations) {
              const relation = {
                address: rel.objectAvatar as Address,
                name: (rel as any).name,
                previewImageUrl: (rel as any).previewImageUrl,
              };

              if (rel.relation === 'mutuallyTrusts') {
                mutual.push(relation);
              } else if (rel.relation === 'trusts') {
                trusts.push(relation);
              } else if (rel.relation === 'trustedBy') {
                trustedBy.push(relation);
              }
            }
            console.log('[TrustEventsPanel] Grouped from fallback - mutual:', mutual.length, 'trusts:', trusts.length, 'trustedBy:', trustedBy.length);
          }
        } catch (fallbackErr) {
          console.error('[TrustEventsPanel] Fallback also failed:', fallbackErr);
        }
      }

      trustData = { mutual, trusts, trustedBy };
      console.log('[TrustEventsPanel] Final trust data:', trustData);
    } catch (err) {
      console.error('[TrustEventsPanel] Failed to load trust relations:', err);
      error = 'Failed to load trust relations';
      trustData = null;
    } finally {
      isLoading = false;
    }
  }

  async function refresh() {
    const sdk = $circles;
    const avatar = avatarState.avatar;
    if (sdk && avatar?.address) {
      await loadTrustRelations(sdk as Sdk, avatar.address as Address);
    }
  }

  const totalCount = $derived(
    (trustData?.mutual.length ?? 0) +
    (trustData?.trusts.length ?? 0) +
    (trustData?.trustedBy.length ?? 0)
  );
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-12">
    <span class="loading loading-spinner loading-md"></span>
    <span class="ml-2 text-base-content/60">Loading trust relations...</span>
  </div>
{:else if error}
  <div class="flex flex-col items-center justify-center py-12 gap-4">
    <div class="flex items-center gap-2 text-error">
      <Lucide icon={AlertCircle} size={20} />
      <span>{error}</span>
    </div>
    <button class="btn btn-sm btn-ghost" onclick={refresh}>
      <Lucide icon={RefreshCw} size={16} />
      Retry
    </button>
  </div>
{:else if !trustData || totalCount === 0}
  <div class="flex flex-col items-center justify-center py-12 text-base-content/60">
    <p>No trust relationships found.</p>
    <p class="text-sm mt-1">Trust others to expand your Circles network.</p>
  </div>
{:else}
  <div class="space-y-6">
    <!-- Mutual Trust -->
    {#if trustData.mutual.length > 0}
      <div>
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-medium flex items-center gap-2 text-base-content/80">
            <Lucide icon={ArrowLeftRight} size={16} class="text-success" />
            Mutual Trust ({trustData.mutual.length})
          </h3>
          <button class="btn btn-xs btn-ghost gap-1" onclick={refresh}>
            <Lucide icon={RefreshCw} size={14} />
            Refresh
          </button>
        </div>
        <p class="text-xs text-base-content/50 mb-2">
          You trust each other — your tokens are interchangeable.
        </p>
        <div class="space-y-0.5">
          {#each trustData.mutual as relation (relation.address)}
            <RowFrame clickable={true} dense={true} noLeading={true}>
              <Avatar
                address={relation.address}
                view="horizontal"
                clickable={true}
                bottomInfo="Mutual trust"
              />
            </RowFrame>
          {/each}
        </div>
      </div>
    {/if}

    <!-- You Trust -->
    {#if trustData.trusts.length > 0}
      <div>
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-medium flex items-center gap-2 text-base-content/80">
            <Lucide icon={ArrowRight} size={16} class="text-primary" />
            You Trust ({trustData.trusts.length})
          </h3>
          {#if trustData.mutual.length === 0}
            <button class="btn btn-xs btn-ghost gap-1" onclick={refresh}>
              <Lucide icon={RefreshCw} size={14} />
              Refresh
            </button>
          {/if}
        </div>
        <p class="text-xs text-base-content/50 mb-2">
          You accept their tokens, but they haven't trusted you back yet.
        </p>
        <div class="space-y-0.5">
          {#each trustData.trusts as relation (relation.address)}
            <RowFrame clickable={true} dense={true} noLeading={true}>
              <Avatar
                address={relation.address}
                view="horizontal"
                clickable={true}
                bottomInfo="You trust them"
              />
            </RowFrame>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Trusted By -->
    {#if trustData.trustedBy.length > 0}
      <div>
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-medium flex items-center gap-2 text-base-content/80">
            <Lucide icon={ArrowLeft} size={16} class="text-info" />
            Trusted By ({trustData.trustedBy.length})
          </h3>
          {#if trustData.mutual.length === 0 && trustData.trusts.length === 0}
            <button class="btn btn-xs btn-ghost gap-1" onclick={refresh}>
              <Lucide icon={RefreshCw} size={14} />
              Refresh
            </button>
          {/if}
        </div>
        <p class="text-xs text-base-content/50 mb-2">
          They accept your tokens. Trust them back to enable mutual exchange.
        </p>
        <div class="space-y-0.5">
          {#each trustData.trustedBy as relation (relation.address)}
            <RowFrame clickable={true} dense={true} noLeading={true}>
              <Avatar
                address={relation.address}
                view="horizontal"
                clickable={true}
                bottomInfo="Trusts you"
              />
            </RowFrame>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
