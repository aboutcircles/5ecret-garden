<script lang="ts">
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { createBaseGroups, createAllGroups, createSearchGroups } from '$lib/areas/groups/state/groups.svelte';
  import { derived, type Readable } from 'svelte/store';
  import GroupRowView from './GroupRowView.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import { circles } from '$lib/shared/state/circles';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  type Tab = 'my-groups' | 'all-groups';

  // Read initial tab from URL, fallback to default based on avatar type
  function getInitialTab(): Tab {
    const urlTab = $page.url.searchParams.get('tab');
    if (urlTab === 'my-groups' || urlTab === 'all-groups') {
      return urlTab;
    }
    return avatarState.isHuman ? 'my-groups' : 'all-groups';
  }

  // Read initial search query from URL
  function getInitialQuery(): string {
    return $page.url.searchParams.get('q') || '';
  }

  let activeTab: Tab = $state(getInitialTab());
  let searchQuery = $state(getInitialQuery());
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Sync tab and search to URL (with dedup to prevent navigation flooding)
  let lastUrlString = '';
  function updateUrl(tab: Tab, query: string) {
    const url = new URL($page.url);
    url.searchParams.set('tab', tab);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }

    // Prevent redundant navigation calls
    const newUrlString = url.toString();
    if (newUrlString === lastUrlString) return;
    lastUrlString = newUrlString;

    goto(newUrlString, { replaceState: true, keepFocus: true });
  }

  // Update URL when tab changes
  function setActiveTab(tab: Tab) {
    activeTab = tab;
    updateUrl(tab, searchQuery);
  }

  // Handle search input with debounce
  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateUrl(activeTab, searchQuery);
      // Trigger search for all-groups tab
      if (activeTab === 'all-groups' && $circles) {
        performSearch(searchQuery);
      }
    }, 300);
  }

  // Search state for all-groups tab
  let searchedGroups:
    | Readable<{
        data: GroupRow[];
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = $state();
  let isSearching = $state(false);

  async function performSearch(query: string) {
    if (!$circles || !query.trim()) {
      searchedGroups = undefined;
      return;
    }

    isSearching = true;
    try {
      searchedGroups = await createSearchGroups($circles, query.trim());
    } catch (error) {
      console.error('Group search failed:', error);
      searchedGroups = undefined;
    } finally {
      isSearching = false;
    }
  }

  // Initialize search if URL has query param
  $effect(() => {
    if ($circles && searchQuery && activeTab === 'all-groups' && !searchedGroups) {
      performSearch(searchQuery);
    }
  });

  // Create a filtered version of myGroups for client-side search
  let filteredMyGroups: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }> | undefined = $state();

  $effect(() => {
    if (myGroups && searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredMyGroups = derived(myGroups, ($myGroups) => ({
        data: $myGroups.data.filter((g: any) =>
          g.name?.toLowerCase().includes(lowerQuery) ||
          g.symbol?.toLowerCase().includes(lowerQuery)
        ),
        next: async () => false,
        ended: true,
      }));
    } else {
      filteredMyGroups = undefined;
    }
  });

  let myGroups:
    | Readable<{
        data: any[];
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = $state();
  let myGroupsUnsubscribe: (() => void) | undefined;

  let allGroups:
    | Readable<{
        data: GroupRow[];
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = $state();

  let isLoadingMyGroups = $state(false);
  let isLoadingAllGroups = $state(false);

  // Update default tab when avatar changes (non-humans can't view my-groups)
  $effect(() => {
    if (!avatarState.isHuman && activeTab === 'my-groups') {
      setActiveTab('all-groups');
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
          myGroups = result.store;
          myGroupsUnsubscribe = result.unsubscribe;
          isLoadingMyGroups = false;
        })
        .catch(() => {
          isLoadingMyGroups = false;
        });
    }

    // Cleanup when component unmounts or avatar changes
    return () => {
      if (myGroupsUnsubscribe) {
        myGroupsUnsubscribe();
        myGroupsUnsubscribe = undefined;
      }
    };
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
  const pageActions: Action[] = [];
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
  {#snippet title()}
    <h1 class="h2">Groups</h1>
  {/snippet}
  {#snippet meta()}and Communities{/snippet}
  {#snippet actions()}
    {#each pageActions as a (a.id)}
      <button
        type="button"
        class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <span>{a.label}</span>
      </button>
    {/each}
  {/snippet}
  {#snippet collapsed_left()}
    <span
      class="text-base md:text-lg font-semibold tracking-tight text-base-content"
    >
      Groups
    </span>
  {/snippet}
  {#snippet collapsed_menu()}
    {#each pageActions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <span>{a.label}</span>
      </button>
    {/each}
  {/snippet}

  {#if avatarState.isHuman}
    <div role="tablist" class="tabs tabs-bordered w-full mb-4">
      <button
        role="tab"
        class="tab"
        class:tab-active={activeTab === 'my-groups'}
        onclick={() => setActiveTab('my-groups')}
      >
        My Groups
      </button>
      <button
        role="tab"
        class="tab"
        class:tab-active={activeTab === 'all-groups'}
        onclick={() => setActiveTab('all-groups')}
      >
        All Groups
      </button>
    </div>

    <!-- Search input -->
    <div class="mb-4">
      <div class="input input-bordered flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="w-4 h-4 opacity-70"
        >
          <path
            fill-rule="evenodd"
            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
            clip-rule="evenodd"
          />
        </svg>
        <input
          type="text"
          class="grow"
          placeholder="Search groups by name..."
          value={searchQuery}
          oninput={handleSearchInput}
        />
        {#if isSearching}
          <span class="loading loading-spinner loading-xs"></span>
        {/if}
        {#if searchQuery}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            onclick={() => { searchQuery = ''; searchedGroups = undefined; updateUrl(activeTab, ''); }}
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
    </div>

    {#if activeTab === 'my-groups'}
      {#if isLoadingMyGroups}
        <div class="w-full flex flex-col items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <span class="mt-4 text-base-content/70">Loading your groups...</span>
        </div>
      {:else if searchQuery && filteredMyGroups}
        <!-- Client-side filtered my groups -->
        <GenericList store={filteredMyGroups} row={GroupRowView} />
      {:else if myGroups}
        <GenericList store={myGroups} row={GroupRowView} />
      {:else}
        <div class="p-4 text-center text-base-content/60">Loading groups...</div>
      {/if}
    {:else if searchQuery && searchedGroups}
      <!-- Server-side search results for all groups -->
      <GenericList store={searchedGroups} row={GroupRowView} />
    {:else if isLoadingAllGroups || isSearching}
      <div class="w-full flex flex-col items-center justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <span class="mt-4 text-base-content/70">{isSearching ? 'Searching groups...' : 'Loading all groups...'}</span>
      </div>
    {:else}
      <GenericList store={allGroups} row={GroupRowView} />
    {/if}
  {:else}
    <!-- Organizations only see all groups -->
    <!-- Search input -->
    <div class="mb-4">
      <div class="input input-bordered flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="w-4 h-4 opacity-70"
        >
          <path
            fill-rule="evenodd"
            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
            clip-rule="evenodd"
          />
        </svg>
        <input
          type="text"
          class="grow"
          placeholder="Search groups by name..."
          value={searchQuery}
          oninput={handleSearchInput}
        />
        {#if isSearching}
          <span class="loading loading-spinner loading-xs"></span>
        {/if}
        {#if searchQuery}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            onclick={() => { searchQuery = ''; searchedGroups = undefined; updateUrl(activeTab, ''); }}
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
    </div>

    {#if searchQuery && searchedGroups}
      <GenericList store={searchedGroups} row={GroupRowView} />
    {:else if isLoadingAllGroups || isSearching}
      <div class="w-full flex flex-col items-center justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <span class="mt-4 text-base-content/70">{isSearching ? 'Searching groups...' : 'Loading all groups...'}</span>
      </div>
    {:else}
      <GenericList store={allGroups} row={GroupRowView} />
    {/if}
  {/if}
</PageScaffold>
