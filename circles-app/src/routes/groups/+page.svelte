<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import { createBaseGroups, createAllGroups } from '$lib/stores/groups.svelte';
  import type { Readable } from 'svelte/store';
  import GroupRowView from './GroupRowView.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import { circles } from '$lib/stores/circles';
  import type { GroupRow } from '@aboutcircles/sdk-types';

  type Tab = 'my-groups' | 'all-groups';

  // Default to 'all-groups' for non-humans, 'my-groups' for humans
  let activeTab: Tab = $state(avatarState.isHuman ? 'my-groups' : 'all-groups');

  let myGroups:
    | Readable<{
        data: any[];
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = $state();

  let allGroups:
    | Readable<{
        data: GroupRow[];
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = $state();

  let isLoadingMyGroups = $state(false);
  let isLoadingAllGroups = $state(false);

  // Update default tab when avatar changes
  $effect(() => {
    if (!avatarState.isHuman && activeTab === 'my-groups') {
      activeTab = 'all-groups';
    }
  });

  $effect(() => {
    if (
      avatarState.avatar &&
      avatarState.isHuman &&
      activeTab === 'my-groups' &&
      !myGroups
    ) {
      isLoadingMyGroups = true;
      createBaseGroups(avatarState.avatar)
        .then((result) => {
          myGroups = result;
          isLoadingMyGroups = false;
        })
        .catch(() => {
          isLoadingMyGroups = false;
        });
    }
  });

  $effect(() => {
    if ($circles && activeTab === 'all-groups' && !allGroups) {
      isLoadingAllGroups = true;
      createAllGroups($circles)
        .then((result) => {
          allGroups = result;
          isLoadingAllGroups = false;
        })
        .catch(() => {
          isLoadingAllGroups = false;
        });
    }
  });

  type Action = {
    id: string;
    label: string;
    iconNode: any;
    onClick: () => void;
    variant: 'primary' | 'ghost';
    disabled?: boolean;
  };
  const actions: Action[] = [];
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  <svelte:fragment slot="title">
    <h1 class="h2">Groups</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">and Communities</svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span
      class="text-base md:text-lg font-semibold tracking-tight text-base-content"
    >
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

  {#if avatarState.isHuman}
    <div role="tablist" class="tabs tabs-bordered w-full mb-4">
      <button
        role="tab"
        class="tab"
        class:tab-active={activeTab === 'my-groups'}
        onclick={() => (activeTab = 'my-groups')}
      >
        My Groups
      </button>
      <button
        role="tab"
        class="tab"
        class:tab-active={activeTab === 'all-groups'}
        onclick={() => (activeTab = 'all-groups')}
      >
        All Groups
      </button>
    </div>

    {#if activeTab === 'my-groups'}
      {#if isLoadingMyGroups}
        <div class="w-full flex flex-col items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <span class="mt-4 text-base-content/70">Loading your groups...</span>
        </div>
      {:else}
        <GenericList store={myGroups} row={GroupRowView} />
      {/if}
    {:else if isLoadingAllGroups}
      <div class="w-full flex flex-col items-center justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <span class="mt-4 text-base-content/70">Loading all groups...</span>
      </div>
    {:else}
      <GenericList store={allGroups} row={GroupRowView} />
    {/if}
  {:else}
    <!-- Organizations only see all groups -->
    {#if isLoadingAllGroups}
      <div class="w-full flex flex-col items-center justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <span class="mt-4 text-base-content/70">Loading all groups...</span>
      </div>
    {:else}
      <GenericList store={allGroups} row={GroupRowView} />
    {/if}
  {/if}
</PageScaffold>
