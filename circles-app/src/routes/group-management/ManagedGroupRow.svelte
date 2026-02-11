<script lang="ts">
  import type { GroupRow } from '@circles-sdk/data';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';

  interface Props {
    item: GroupRow;
    onManageMembers: (group: string) => void;
    onManageSettings: (group: string) => void;
    onOpenStats: (group: string) => void;
    onOpenDetail: (group: string) => void;
  }

  let { item, onManageMembers, onManageSettings, onOpenStats, onOpenDetail }: Props = $props();

  function openDetail() {
    onOpenDetail(item.group);
  }
</script>

<RowFrame clickable={true} dense={false} noLeading={true} onclick={openDetail}>
  <div class="w-full flex flex-col gap-2">
    <Avatar
      address={item.group}
      view="horizontal"
      clickable={false}
      bottomInfo={`${item.memberCount ?? 0} member${(item.memberCount ?? 0) === 1 ? '' : 's'}`}
    />

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-xs btn-primary"
        onclick={(e) => {
          e.stopPropagation();
          onManageMembers(item.group);
        }}
      >
        Members
      </button>

      <button
        type="button"
        class="btn btn-xs btn-ghost"
        onclick={(e) => {
          e.stopPropagation();
          onManageSettings(item.group);
        }}
      >
        Settings
      </button>

      <button
        type="button"
        class="btn btn-xs btn-ghost"
        onclick={(e) => {
          e.stopPropagation();
          onOpenStats(item.group);
        }}
      >
        Stats
      </button>
    </div>
  </div>

  {#snippet trailing()}
    <div aria-hidden="true">
      <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
    </div>
  {/snippet}
</RowFrame>
