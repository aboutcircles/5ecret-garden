<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import QrCode from '$lib/components/QrCode.svelte';

  export let address: string | undefined;

  let copyIcon = '/copy.svg';
  function handleCopy() {
    navigator.clipboard.writeText(address ?? '');
    copyIcon = '/check.svg';
    
    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }
</script>

<div
  class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-8 mt-10"
>
  <Avatar view="vertical" clickable={false} {address} />

  <button
    on:click={handleCopy}
    class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer"
  >
    {address}
    <img src={copyIcon} alt="Copy" class="w-4 h-4 inline" />
  </button>

  <div class="p-2 shadow-lg rounded-lg my-8">
    <QrCode value={address} />
  </div>
</div>
