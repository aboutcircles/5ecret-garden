<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import { createCMGroups } from '$lib/stores/groups.svelte';
  import type { Readable } from 'svelte/store';
  import type { EventRow, GroupRow } from '@circles-sdk/data';
  import GroupRowView from './GroupRowView.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';

  let groups: Readable<{
    data: EventRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }> | undefined = $state();

  $effect(() => {
    if (avatarState.avatar) {
      createCMGroups(avatarState.avatar).then((result) => {
        groups = result;
      });
    }
  });
</script>

<div
  class="flex flex-col items-start w-full max-w-3xl gap-y-4 mt-32"
>
  <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Groups</div>
  <div class="w-full bg-white border rounded-lg px-4 flex flex-col divide-y py-4">
    {#if groups}
      <GenericList store={groups} row={GroupRowView} />
    {/if}
  </div>
</div>
