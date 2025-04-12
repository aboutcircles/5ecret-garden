<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import { createCMGroups } from '$lib/stores/groups';
  import type { Readable } from 'svelte/store';
  import type { EventRow, GroupRow } from '@circles-sdk/data';
  import GroupRowView from './GroupRowView.svelte';

  let groups: Readable<{
    data: EventRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }> = $state();

  $effect(() => {
    createCMGroups().then((result) => {
      groups = result;
    });
  });
</script>

<div
  class="flex flex-col w-full sm:w-[90%] lg:w-3/5 gap-y-5 mt-28 mb-10 text-[#161616]"
>
  <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Groups</div>
  <div class="w-full md:border rounded-lg md:px-4">
    <GenericList store={groups} row={GroupRowView} />
  </div>
</div>
