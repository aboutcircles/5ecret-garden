<script lang="ts">
  import ProfilePage from '$lib/pages/Profile.svelte';
  import Avatar from './avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { circles } from '$lib/stores/circles';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    otherAvatarAddress: Address | undefined;
    commonConnectionsCount?: number;
  }

  // Props with default
  let { otherAvatarAddress, commonConnectionsCount = $bindable(0) }: Props = $props();

  // Local state
  let commonContacts: Address[] = $state([]);

  async function initialize() {
    if (!otherAvatarAddress) return;

    if (!$circles || !avatarState.avatar) return;

    // Use the RPC call to get the array of common trust addresses
    // The plugin will return an array of addresses both trust or mutually trust.
    // Exactly which relationships count as "common trust" is up to the node’s RPC logic,
    // but presumably it’s all addresses that appear in both trust sets.
    const common = await $circles.data.rpc.call<Address[]>('circles_getCommonTrust', [avatarState.avatar.address, otherAvatarAddress]);
    // ^ This returns something like an array of addresses: ["0xabc...", "0x123..."]

    // 3) Set them to local state
    commonContacts = common.result;
    commonConnectionsCount = commonContacts.length;
  }

  // Re-run initialize() whenever otherAvatarAddress changes
  $effect(() => {
    if (otherAvatarAddress) {
      initialize();
    }
  });
</script>

<div class="w-full divide-y p-4">
  {#each commonContacts as contact (contact)}
    <button
      class="w-full flex items-center justify-between px-0 py-4 hover:bg-base-200 rounded-lg"
      onclick={(e) => {
        popupControls.open({
          component: ProfilePage,
          title: '',
          props: { address: contact },
        });
        e.preventDefault();
      }}
    >
      <Avatar address={contact} view="horizontal" clickable={false} />
    </button>
  {/each}
  {#if commonContacts.length === 0}
    <li>No common connections</li>
  {/if}
</div>
