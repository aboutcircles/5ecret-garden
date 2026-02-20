<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import { circles } from '$lib/shared/state/circles';
  import { get } from 'svelte/store';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import TrustActionCard from '$lib/areas/contacts/ui/components/TrustActionCard.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';

  interface Props {
    group: Address;
    address: Address;
    onTrusted?: () => void | Promise<void>;
  }

  let { group, address, onTrusted }: Props = $props();

  async function trustFromGroup() {
    const sdk = get(circles);
    if (!sdk) throw new Error('Circles SDK not available');

    const groupAvatar = await sdk.getAvatar(group);
    await runTask({
      name: `${shortenAddress(group)} trusts ${shortenAddress(address)} ...`,
      promise: groupAvatar.trust.add(address),
    });

    await onTrusted?.();
    popupControls.close();
  }
</script>

<TrustActionCard
  address={address as `0x${string}`}
  intro={`You're about to add trust relation: ${shortenAddress(group)} trusts:`}
  warning="This updates the selected group's trust set."
  cta="Confirm trust"
  action={trustFromGroup}
/>
