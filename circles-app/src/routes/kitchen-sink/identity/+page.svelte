<script lang="ts">
  import type { Address } from '@circles-sdk/utils';

  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import AddressComponent from '$lib/shared/ui/primitives/Address.svelte';
  import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
  import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
  import { T } from '$lib/design-system/tokens';

  const demoAddressA = '0x1111111111111111111111111111111111111111' as Address;
  const demoAddressB = '0x2222222222222222222222222222222222222222' as Address;
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Identity & Utility</h2>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Avatar variants</h3>
    <div class="flex flex-wrap items-center gap-4">
      <Avatar address={demoAddressA} view="small" clickable={false} placeholderAvatar={true} placeholderTop={true} />
      <Avatar address={demoAddressA} view="horizontal" clickable={false} bottomInfo="Horizontal variant" />
      <Avatar address={demoAddressB} view="small_reverse" clickable={false} />
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Address / Tooltip / JumpLink</h3>
    <div class="flex flex-wrap items-center gap-4">
      <AddressComponent address={demoAddressA} />
      <Tooltip content="This is a tooltip demo">
        {#snippet children()}
          <button style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;">Hover me</button>
        {/snippet}
      </Tooltip>
      <JumpLink url="https://aboutcircles.com" className="link link-primary">External jump link</JumpLink>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">QR Code</h3>
    <QrCode value="https://aboutcircles.com/kitchen-sink" />
  </div>
</section>
