<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import { createCMGroups } from '$lib/stores/groups.svelte';
  import type { Readable } from 'svelte/store';
  import type { EventRow } from '@circles-sdk/data';
  import GroupRowView from './GroupRowView.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import {roundToDecimals} from "$lib/utils/shared";

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

  type Action = { id: string; label: string; iconNode: any; onClick: () => void; variant: 'primary'|'ghost'; disabled?: boolean };
  const actions: Action[] = [];
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2">Groups</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    {($groups?.data?.length ?? 0)} groups
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button type="button" class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`} onclick={a.onClick} aria-label={a.label}>
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
  <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Groups
  </span>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  <GenericList store={groups} row={GroupRowView} />
</PageScaffold>
