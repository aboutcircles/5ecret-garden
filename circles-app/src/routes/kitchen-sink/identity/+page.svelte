<script lang="ts">
  import type { Address } from '@circles-sdk/utils';

  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import AddressComponent from '$lib/shared/ui/common/Address.svelte';
  import Tooltip from '$lib/shared/ui/common/Tooltip.svelte';
  import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';
  import QrCode from '$lib/shared/ui/common/QrCode.svelte';

  const demoAddressA = '0x1111111111111111111111111111111111111111' as Address;
  const demoAddressB = '0x2222222222222222222222222222222222222222' as Address;
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Identity & Utility</h2>

  <div class="space-y-2">
    <h3 class="font-medium">Avatar variants</h3>
    <div class="flex flex-wrap items-center gap-4">
      <Avatar address={demoAddressA} view="small" clickable={false} placeholderAvatar={true} placeholderTop={true} />
      <Avatar address={demoAddressA} view="horizontal" clickable={false} bottomInfo="Horizontal variant" />
      <Avatar address={demoAddressB} view="small_reverse" clickable={false} />
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Address / Tooltip / JumpLink</h3>
    <div class="flex flex-wrap items-center gap-4">
      <AddressComponent address={demoAddressA} />
      <Tooltip content="This is a tooltip demo">
        {#snippet children()}
          <button class="btn btn-sm btn-outline">Hover me</button>
        {/snippet}
      </Tooltip>
      <JumpLink url="https://aboutcircles.com" className="link link-primary">External jump link</JumpLink>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">QR Code</h3>
    <QrCode value="https://aboutcircles.com/kitchen-sink" />
  </div>
</section>
