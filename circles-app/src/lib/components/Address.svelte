<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';
  import type { Address } from '@circles-sdk/utils';

  let copyIcon = $state('/copy.svg');
  interface Props {
    address: Address;
  }

  let { address }: Props = $props();

  function handleCopy() {
    navigator.clipboard.writeText(address);
    copyIcon = '/check.svg';

    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }
</script>

<button onclick={handleCopy} class="btn btn-sm">
  {shortenAddress(address)}
  <img src={copyIcon} alt="Copy" class="w-4 h-4 inline" />
</button>
