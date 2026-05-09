<script lang="ts">
  import type { Address } from '@circles-sdk/utils';

  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import TrustHistoryHeatmap from '$lib/areas/trust/ui/TrustHistoryHeatmap.svelte';
  import { tokenTypeToString, transitiveTransfer } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import { T } from '$lib/design-system/tokens';

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
    openProfilePopup(demoAddress, { title: 'Profile popup demo' });
  }
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Flows & Domain</h2>
  <p style="font-size:13px;color:{T.inkMuted};margin:0;">
    Domain-focused demos using flow/page primitives and helpers from production code paths.
  </p>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Popup flow entry: ProfilePopup</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;" onclick={openProfilePopupDemo}>Open profile popup demo</button>
      <span style="font-size:11.5px;color:{T.inkMuted};align-self:center;">Address: {demoAddress}</span>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">SelectAsset helpers</h3>
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

    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;background:{T.pageDeep};font-size:11.5px;">
      <div style="font-weight:500;margin-bottom:4px;">`transitiveTransfer()` sample</div>
      <pre style="white-space:pre-wrap;word-break:break-all;">{JSON.stringify(transfer, null, 2)}</pre>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Trust history heatmap shell</h3>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      Toggle address binding to compare empty state and data-loading behavior.
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={() => (trustAddress = undefined)}>No address</button>
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={() => (trustAddress = demoAddress)}>Use demo address</button>
    </div>
    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;">
      <TrustHistoryHeatmap address={trustAddress} />
    </div>
  </div>
</section>
