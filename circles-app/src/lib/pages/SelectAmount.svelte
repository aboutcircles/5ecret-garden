<script lang="ts">
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import CurrencyInput from '$lib/components/CurrencyInput.svelte';

  export let asset: TokenBalanceRow;
  export let amount: number = 0;
  export let maxAmountCircles: number = -1;
</script>

<div class="mb-4">
  <CurrencyInput balanceRow={asset} bind:amount {maxAmountCircles}></CurrencyInput>
</div>

