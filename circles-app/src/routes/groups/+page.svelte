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
  }> = $state();

  $effect(() => {
    if (avatarState.avatar) {
      createCMGroups(avatarState.avatar).then((result) => {
        groups = result;
      });
    }
  });
</script>

<div class="page page-pt page-stack page--lg">
  <h1 class="h2">Groups</h1>
  <div class="section--list">
    <GenericList store={groups} row={GroupRowView} />
  </div>
</div>
