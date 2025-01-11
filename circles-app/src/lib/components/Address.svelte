<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';

  let copyIcon = '/copy.svg';
  export let address: string;

  function handleCopy() {
    navigator.clipboard.writeText(address);
    copyIcon = '/check.svg';

    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }
</script>

<button
  on:click={handleCopy}
  class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer"
>
  {shortenAddress(address)}
  <img src={copyIcon} alt="Copy" class="w-4 h-4 inline" />
</button>
