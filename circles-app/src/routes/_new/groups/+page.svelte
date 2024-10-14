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

<div
  class="flex flex-col w-[90%] lg:w-3/5 border rounded-lg px-4 py-8 gap-y-4"
>
  <div class="text-xl font-bold">Groups</div>
  {#if groups}
    <GenericList store={groups} row={GroupRowView} />
  {/if}
</div>
