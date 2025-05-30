<script lang="ts">
  import { CirclesStorage } from '$lib/utils/storage';
  import SeedphraseInput from './SeedphraseInput.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import { goto } from '$app/navigation';
  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey: string = $state('');
  let address = $state('');

  function savePrivateKey() {
    CirclesStorage.getInstance().data = {
      privateKey: privateKey,
    };
    popupControls.close();
    goto('/connect-wallet/import-circles-garden');
  }
</script>

<p class="font-normal text-black/60 text-base">
  Please enter or paste your keyphrase from circles.garden below.
</p>
<SeedphraseInput
  bind:isValidMnemonic={hasValidKey}
  bind:privateKey
  bind:mnemonicPhrase
  bind:address
/>
<button
  onclick={savePrivateKey}
  class="btn btn-sm"
  class:btn-disabled={!hasValidKey}
  >Import
</button>
