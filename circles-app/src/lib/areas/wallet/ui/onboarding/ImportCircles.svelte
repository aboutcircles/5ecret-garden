<script lang="ts">
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import SeedphraseInput from '$lib/areas/wallet/ui/onboarding/components/SeedphraseInput.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import { goto } from '$app/navigation';
  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey: string = $state('');
  let address = $state('');

  function savePrivateKey() {
    CirclesStorage.getInstance().data = {
      privateKey: privateKey,
    };
    popupControls.closeAndThen(() => {
      void goto('/connect-wallet/import-circles-garden');
    });
  }
</script>

<p class="text-sm text-base-content/60 mb-4">
  Enter or paste your seed phrase from circles.garden below.
</p>
<SeedphraseInput
  bind:isValidMnemonic={hasValidKey}
  bind:privateKey
  bind:mnemonicPhrase
  bind:address
/>
<button
  onclick={savePrivateKey}
  class="btn btn-primary btn-sm mt-4 w-full"
  class:btn-disabled={!hasValidKey}
>
  Import
</button>
