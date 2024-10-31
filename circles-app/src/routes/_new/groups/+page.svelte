<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import { createGroups } from '$lib/stores/groups';
  import { onMount } from 'svelte';
  import type { Readable } from 'svelte/store';
  import type { GroupRow } from '@circles-sdk/data';
  import GroupRowView from './GroupRowView.svelte';

  let groups: Readable<{
    data: GroupRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>;
  onMount(async () => {
    groups = await createGroups();
  });
</script>

<div class="flex flex-col w-full sm:w-[90%] lg:w-3/5 p-0 gap-y-5 mt-28 text-[#161616]">
  <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Groups</div>
  <div class="flex flex-col p-0 sm:px-8 sm:py-4 w-full sm:border sm:rounded-lg overflow-x-auto divide-y">
    {#if groups}
      <GenericList store={groups} row={GroupRowView} />
    {/if}
  </div>
</div>
