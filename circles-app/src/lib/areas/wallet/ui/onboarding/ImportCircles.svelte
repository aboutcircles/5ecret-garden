<script lang="ts">
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import SeedphraseInput from '$lib/areas/wallet/ui/onboarding/components/SeedphraseInput.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import { goto } from '$app/navigation';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey: string = $state('');
  let address = $state('');

  function savePrivateKey() {
    CirclesStorage.getInstance().data = { privateKey: privateKey };
    popupControls.closeAndThen(() => {
      void goto('/connect-wallet/import-circles-garden');
    });
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <!-- Header -->
  <div style="display:flex;flex-direction:column;gap:4px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="
        width:32px;height:32px;border-radius:10px;flex-shrink:0;
        background:{T.coralSoft};
        display:inline-flex;align-items:center;justify-content:center;
      ">
        <Icon name="sparkle" size={15} stroke="#8A3A1E" strokeWidth={2} />
      </div>
      <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1.15;">
        Magic words
      </span>
    </div>
    <span style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;">
      Paste your seed phrase from circles.garden to import that account.
    </span>
  </div>

  <!-- Seedphrase input -->
  <div style="
    background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:14px 16px;
  ">
    <SeedphraseInput
      bind:isValidMnemonic={hasValidKey}
      bind:privateKey
      bind:mnemonicPhrase
      bind:address
    />
  </div>

  <!-- Security note -->
  <div style="display:flex;align-items:flex-start;gap:8px;padding:0 4px;">
    <Icon name="shield" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
    <span style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;">
      Your seed phrase stays on this device. Circles never sees it.
    </span>
  </div>

  <!-- Submit -->
  <button
    type="button"
    onclick={savePrivateKey}
    disabled={!hasValidKey}
    data-popup-default-action
    style="
      width:100%;height:48px;border-radius:9999px;border:0;cursor:pointer;
      background:{hasValidKey ? T.primary : T.pageDeep};
      color:{hasValidKey ? '#fff' : T.inkMuted};
      display:inline-flex;align-items:center;justify-content:center;gap:8px;
      font-family:{T.fontSans};font-size:14.5px;font-weight:580;letter-spacing:-0.005em;
      box-shadow:{hasValidKey ? '0 6px 18px rgba(88,73,212,0.32),0 1px 0 rgba(255,255,255,0.18) inset' : 'none'};
      opacity:{hasValidKey ? 1 : 0.85};
      transition:background .15s,color .15s,box-shadow .15s;
    "
  >
    Import
  </button>
</div>
