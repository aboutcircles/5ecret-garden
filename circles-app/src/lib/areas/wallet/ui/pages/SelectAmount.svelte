<script lang="ts">
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import CurrencyInput from '$lib/areas/wallet/ui/components/CurrencyInput.svelte';

  interface Props {
    asset: TokenBalanceRow;
    amount?: number;
    maxAmountCircles?: number;
    routeLoading?: boolean;
  }

  let { asset, amount = $bindable(0), maxAmountCircles = -1, routeLoading = false }: Props = $props();
</script>

<div class="mb-4">
  <CurrencyInput balanceRow={asset} bind:amount {maxAmountCircles} {routeLoading} />
</div>

