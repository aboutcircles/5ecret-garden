<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { AvatarRow } from '@circles-sdk/data';
  import type { Address } from '@circles-sdk/utils';

  interface Props {
    invitations?: AvatarRow[];
    loading?: boolean;
    selected?: Address;
    onSelect: (address: Address) => void;
    emptyText?: string;
  }

  let {
    invitations = [],
    loading = false,
    selected = $bindable<Address | undefined>(),
    onSelect,
    emptyText = 'No invitations pending.',
  }: Props = $props();
</script>

<div class="flex flex-col gap-y-2 text-sm">
  {#if loading}
    <p class="text-base-content/70">Loading invitations...</p>
  {:else if invitations.length > 0}
    {#each invitations as inviter (inviter.avatar)}
      <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => onSelect(inviter.avatar)}>
        <div class="flex items-center gap-x-2 min-w-0">
          <input
            type="radio"
            name="inviter"
            class="radio radio-success radio-sm"
            checked={selected === inviter.avatar}
            onclick={(e) => {
              e.stopPropagation();
              onSelect(inviter.avatar);
            }}
          />
          <Avatar topInfo="Inviter" clickable={false} address={inviter.avatar} view="horizontal" />
        </div>
      </RowFrame>
    {/each}
  {:else}
    <slot name="empty">
      {emptyText}
    </slot>
  {/if}
</div>
