<script lang="ts">
  import { shortenAddress } from '$lib/shared/utils/shared';
  import type { Address } from '@circles-sdk/utils';
  import { T } from '$lib/design-system/tokens.js';

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

<button onclick={handleCopy} style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:8px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:13px;cursor:pointer;">
  {shortenAddress(address)}
  <img src={copyIcon} alt="Copy" style="width:16px;height:16px;display:inline;" />
</button>
