<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';

  export type GroupMemberItem = {
    address: Address;
    profile?: Profile;
    avatarType?: string;
  };

  type RowContext = {
    selectedSet: Readable<Set<string>>;
    onToggleSelected: (address: Address, checked: boolean) => void;
    onUntrust: (address: Address) => void;
    onActivateRow: (address: Address) => void;
    onRowKeydown: (event: KeyboardEvent) => void;
  };

  interface Props {
    item: GroupMemberItem;
  }

  let { item }: Props = $props();

  const ctx = getContext<RowContext>('groupMemberRowActions');
  const selectedSet = ctx?.selectedSet;
  const selectedKey = $derived(item.address.toLowerCase());
  const isSelected = $derived(
    selectedSet ? ($selectedSet?.has(selectedKey) ?? false) : false
  );

  function typeLabel(t?: string): string {
    if (t === 'CrcV2_RegisterHuman') return 'Human';
    if (t === 'CrcV2_RegisterOrganization') return 'Organization';
    if (t === 'CrcV2_RegisterGroup') return 'Group';
    return 'Unknown';
  }

  function onCheckboxChange(event: Event): void {
    const el = event.currentTarget as HTMLInputElement | null;
    ctx?.onToggleSelected(item.address, Boolean(el?.checked));
  }

  function onRowClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, a')) return;
    ctx?.onActivateRow(item.address);
  }
</script>

<div
  data-trusted-row
  data-trusted-address={item.address}
  tabindex={0}
  role="button"
  aria-pressed={isSelected ? 'true' : 'false'}
  aria-label={`Trusted member ${item.address}`}
  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={(event) => ctx?.onRowKeydown(event)}
  onclick={onRowClick}
>
  <RowFrame clickable={false} dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar
        address={item.address}
        profile={item.profile}
        view="horizontal"
        clickable={true}
        bottomInfo={`${typeLabel(item.avatarType)} • ${item.address}`}
      />
    </div>
    {#snippet trailing()}
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square text-error/80 hover:text-error"
          aria-label="Untrust"
          title="Untrust"
          onclick={(event) => {
            event.stopPropagation();
            ctx?.onUntrust(item.address);
          }}
        >
          <img src="/trash.svg" alt="" class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          checked={isSelected}
          onchange={onCheckboxChange}
        />
      </div>
    {/snippet}
  </RowFrame>
</div>
