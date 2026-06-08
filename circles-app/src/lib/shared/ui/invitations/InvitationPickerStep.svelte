<script lang="ts">
  import type { Snippet } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { AvatarRow } from '@aboutcircles/sdk-types';
  import type { Address } from '@aboutcircles/sdk-types';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    invitations?: AvatarRow[];
    loading?: boolean;
    selected?: Address;
    onSelect: (address: Address) => void;
    emptyText?: string;
    empty?: Snippet;
  }

  let {
    invitations = [],
    loading = false,
    selected = $bindable<Address | undefined>(),
    onSelect,
    emptyText = 'No invitations pending.',
    empty,
  }: Props = $props();
</script>

<div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
  {#if loading}
    <p style="color:{T.inkMuted};margin:0;">Loading invitations...</p>
  {:else if invitations.length > 0}
    {#each invitations as inviter (inviter.address)}
      <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => onSelect(inviter.address)}>
        <div class="flex items-center gap-x-2 min-w-0">
          <input
            type="radio"
            name="inviter"
            class="radio radio-success radio-sm"
            checked={selected === inviter.address}
            onclick={(e) => {
              e.stopPropagation();
              onSelect(inviter.address);
            }}
          />
          <Avatar topInfo="Inviter" clickable={false} address={inviter.address} view="horizontal" />
        </div>
      </RowFrame>
    {/each}
  {:else}
    {#if empty}
      {@render empty()}
    {:else}
      {emptyText}
    {/if}
  {/if}
</div>
