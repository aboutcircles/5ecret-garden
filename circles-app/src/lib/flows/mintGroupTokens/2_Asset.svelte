<script lang="ts">
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import SelectAsset from '$lib/pages/SelectAsset.svelte';
  import { onMount } from 'svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { GroupMintFlowContext } from '$lib/flows/mintGroupTokens/context';
  import SelectAmount from './3_Amount.svelte';
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { circles } from '$lib/stores/circles';
  import { writable, derived, type Readable } from 'svelte/store';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    context: GroupMintFlowContext;
  }

  let { context = $bindable() }: Props = $props();

  let selectedAsset: TokenBalanceRow | undefined = $state(undefined);

  // Writable store to hold the set of trusted token owners
  const trustedTokenOwners = writable<Set<string> | null>(null);

  // Derived store for filtered balances
  let filteredBalances: Readable<{
    data: TokenBalanceRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }> = $state();

  onMount(async () => {
    if (context?.selectedAsset) {
      selectedAsset = context.selectedAsset;
    }
    if (!context?.selectedAddress) {
      throw new Error('No selected address');
    }
    if (!$circles?.data) {
      throw new Error('No circles data');
    }

    // Fetch trust relations
    // TODO: 1000 may not be enough; consider implementing pagination
    const query = $circles.data.getTrustRelations(
      context.selectedAddress,
      1000
    );
    await query.queryNextPage();

    const tokenOwnerSet = new Set(
      $circlesBalances.data.map((o) => o.tokenOwner)
    );

    // Compute the set of trusted token owners
    const trustedOwnersSet = new Set(
      query.currentPage?.results
        .filter((trustRelation) => {
          return (
            trustRelation.truster === context.selectedAddress &&
            tokenOwnerSet.has(trustRelation.trustee)
          );
        })
        .map((o) => o.trustee)
    );

    // Update the trustedTokenOwners store
    trustedTokenOwners.set(trustedOwnersSet);
  });

  // Implement the filteredBalances as a derived store
  filteredBalances = derived(
    [circlesBalances, trustedTokenOwners],
    ([$circlesBalances, $trustedTokenOwners]) => {
      if ($trustedTokenOwners) {
        return {
          data: $circlesBalances.data, /*.filter((o) =>
            $trustedTokenOwners.has(o.tokenOwner)
          ),*/
          next: $circlesBalances.next,
          ended: $circlesBalances.ended,
        };
      } else {
        return {
          data: [],
          next: async () => false,
          ended: false,
        };
      }
    }
  );

  function onselect(tokenBalanceRow: TokenBalanceRow) {
    selectedAsset = tokenBalanceRow;
    context.selectedAsset = selectedAsset;

    popupControls.open({
      title: 'Enter Amount',
      component: SelectAmount,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <p class="text-base-content/70 mt-2">Select asset to convert</p>
  {#if $filteredBalances}
    <SelectAsset
      {selectedAsset}
      balances={filteredBalances}
      showTransitive={false}
      {onselect}
    />
  {:else}
    <div class="p-4 text-center text-base-content/70">
      <span class="loading loading-spinner"></span>
    </div>
  {/if}
</FlowDecoration>
