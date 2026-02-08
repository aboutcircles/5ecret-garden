<script lang="ts">
  import type { Address } from '@circles-sdk/utils';

  import { popupControls } from '$lib/shared/state/popup';
import { ProfilePopup } from '$lib/domains/profile/ui/pages';
  import TrustHistoryHeatmap from '$lib/domains/trust/ui/TrustHistoryHeatmap.svelte';
  import { tokenTypeToString, transitiveTransfer } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';

  const demoAddress = '0x1aca75e38263c79d9d4f10df0635cc6fcfe6f026' as Address;

  const tokenTypeSamples = [
    'CrcV2_RegisterHuman',
    'CrcV1_Signup',
    'CrcV2_ERC20WrapperDeployed_Demurraged',
    'CrcV2_ERC20WrapperDeployed_Inflationary',
    'CrcV2_RegisterGroup',
    'TransitiveTransfer',
    'UnknownTokenType'
  ];

  const transfer = $derived(transitiveTransfer());
  let trustAddress = $state<Address | undefined>(undefined);

  function openProfilePopupDemo() {
    popupControls.open({
      title: 'Profile popup demo',
      component: ProfilePopup,
      props: { address: demoAddress }
    });
  }
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Flows & Domain</h2>
  <p class="text-sm opacity-70">
    Domain-focused demos using flow/page primitives and helpers from production code paths.
  </p>

  <div class="space-y-2">
    <h3 class="font-medium">Popup flow entry: ProfilePopup</h3>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-sm btn-primary" onclick={openProfilePopupDemo}>Open profile popup demo</button>
      <span class="text-xs opacity-70 self-center">Address: {demoAddress}</span>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">SelectAsset helpers</h3>
    <div class="overflow-x-auto">
      <table class="table table-xs">
        <thead>
          <tr><th>Token type</th><th>Display label</th></tr>
        </thead>
        <tbody>
          {#each tokenTypeSamples as typeName}
            <tr>
              <td><code>{typeName}</code></td>
              <td>{tokenTypeToString(typeName)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-lg border border-base-300 p-3 bg-base-200/30 text-xs">
      <div class="font-medium mb-1">`transitiveTransfer()` sample</div>
      <pre class="whitespace-pre-wrap break-all">{JSON.stringify(transfer, null, 2)}</pre>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Trust history heatmap shell</h3>
    <p class="text-sm opacity-70">
      Toggle address binding to compare empty state and data-loading behavior.
    </p>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-sm btn-outline" onclick={() => (trustAddress = undefined)}>No address</button>
      <button class="btn btn-sm btn-outline" onclick={() => (trustAddress = demoAddress)}>Use demo address</button>
    </div>
    <div class="rounded-lg border border-base-300 p-3">
      <TrustHistoryHeatmap address={trustAddress} />
    </div>
  </div>
</section>
