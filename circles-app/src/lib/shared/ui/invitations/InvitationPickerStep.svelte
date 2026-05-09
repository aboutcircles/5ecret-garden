<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { AvatarRow } from '@circles-sdk/data';
  import type { Address } from '@circles-sdk/utils';
  import { T } from '$lib/design-system/tokens.js';

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

<div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
  {#if loading}
    <p style="color:{T.inkMuted};margin:0;">Loading invitations...</p>
  {:else if invitations.length > 0}
    {#each invitations as inviter (inviter.avatar)}
      <button
        type="button"
        style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};cursor:pointer;width:100%;box-sizing:border-box;text-align:left;outline:none;"
        onclick={() => onSelect(inviter.avatar)}
      >
        <input
          type="radio"
          name="inviter"
          style="width:14px;height:14px;accent-color:{T.primary};flex-shrink:0;"
          checked={selected === inviter.avatar}
          onclick={(e) => {
            e.stopPropagation();
            onSelect(inviter.avatar);
          }}
        />
        <div style="min-width:0;flex:1;">
          <Avatar topInfo="Inviter" clickable={false} address={inviter.avatar} view="horizontal" />
        </div>
      </button>
    {/each}
  {:else}
    <slot name="empty">
      {emptyText}
    </slot>
  {/if}
</div>
