<script lang="ts">
  import Address from '$lib/components/Address.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import QrCode from '$lib/components/QrCode.svelte';

  export let address: string = '';
</script>

<div
  class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-8 mt-10"
>
  <Avatar view="vertical" clickable={false} {address} />

  <Address {address} />

  <div class="p-2 shadow-lg rounded-lg my-8">
    <QrCode value={address} />
  </div>
</div>
