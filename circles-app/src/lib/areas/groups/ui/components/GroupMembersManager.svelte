<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import { circles } from '$lib/shared/state/circles';
  import { get, writable, type Readable, derived } from 'svelte/store';
  import { setContext, onDestroy } from 'svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { getProfile, getProfilesCoreBatch } from '$lib/shared/utils/profile';
  import type { ProfileAddress } from '$lib/shared/model/profile';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
  import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';
  import { createGroupDataSource } from '$lib/shared/data/circles/groupDataSource';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import SearchablePaginatedList from '$lib/shared/ui/lists/SearchablePaginatedList.svelte';
  import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
  import GroupMemberRow, {
    type GroupMemberItem,
  } from '$lib/areas/groups/ui/components/GroupMemberRow.svelte';

  interface Props {
    group: Address;
  }

  let { group }: Props = $props();

  // Match the transaction-history and contacts page sizes so the first batch of
  // members renders fast; remaining pages are lazy-loaded on scroll instead of
  // draining the entire member set on mount.
  const PAGE_SIZE = 25;

  let loading: boolean = $state(false);
  let error: string | null = $state(null);
  let groupName: string | null = $state(null);
  let totalMemberCount: number | undefined = $state(undefined);
  let listScopeEl: HTMLDivElement | null = $state(null);

  // Selection state lives outside the virtualized rows so toggling a checkbox
  // doesn't rebuild item identities (which would cost re-render on every row).
  const selectedSetStore = writable<Set<string>>(new Set());
  let selectedCount = $state(0);
  selectedSetStore.subscribe((s) => {
    selectedCount = s.size;
  });

  // The list backing store. Items always include an `address`; `profile` and
  // `avatarType` are filled in by the background enrich pass.
  const items = writable<GroupMemberItem[]>([]);

  // Cursor-based pagination state; reset whenever the group changes.
  let cursor: string | null = $state(null);
  let ended: boolean = $state(false);
  let loadGeneration = 0;
  let nextInflight: Promise<boolean> | null = null;

  const groupDisplayName = $derived(
    ((groupName ?? '') as string).length > 0
      ? ((groupName ?? '') as string)
      : shortenAddress(group)
  );

  function resetState(): void {
    items.set([]);
    selectedSetStore.set(new Set());
    cursor = null;
    ended = false;
    totalMemberCount = undefined;
    error = null;
    nextInflight = null;
  }

  async function enrich(addrs: Address[], generation: number): Promise<void> {
    if (addrs.length === 0) return;
    const sdk = get(circles);
    if (!sdk) return;
    try {
      const [profiles, infos] = await Promise.all([
        getProfilesCoreBatch(addrs.map((a) => a.toLowerCase()) as ProfileAddress[]),
        createAvatarDataSource(sdk).getAvatarInfoBatch(addrs),
      ]);
      if (generation !== loadGeneration) return;
      const typeMap = new Map<string, string>();
      for (const info of infos) {
        if (info) typeMap.set(String(info.avatar).toLowerCase(), info.type);
      }
      items.update((current) =>
        current.map((it) => {
          const key = it.address.toLowerCase();
          const nextProfile = profiles.get(key as ProfileAddress) ?? it.profile;
          const nextType = typeMap.get(key) ?? it.avatarType;
          if (nextProfile === it.profile && nextType === it.avatarType) return it;
          return { ...it, profile: nextProfile, avatarType: nextType };
        })
      );
    } catch (e) {
      console.debug('[GroupMembersManager] enrich failed', e);
    }
  }

  async function loadNextPage(): Promise<boolean> {
    if (ended) return true;
    if (nextInflight) return nextInflight;
    const sdk = get(circles);
    if (!sdk || !group) return ended;

    const generation = loadGeneration;
    const promise = (async () => {
      loading = true;
      try {
        const ds = createGroupDataSource(sdk);
        const page = await ds.getGroupMembersPage(group, cursor, PAGE_SIZE);
        if (generation !== loadGeneration) return ended;

        if (page.results.length === 0) {
          ended = true;
          return true;
        }

        const groupKey = group.toLowerCase();
        const current = get(items);
        const seen = new Set(current.map((it) => it.address.toLowerCase()));
        const newAddrs: Address[] = [];
        const newItems: GroupMemberItem[] = [];
        for (const row of page.results) {
          const addr = row.member as Address;
          const key = addr.toLowerCase();
          if (key === groupKey || seen.has(key)) continue;
          seen.add(key);
          newAddrs.push(addr);
          newItems.push({ address: addr });
        }

        if (newItems.length > 0) {
          items.update((arr) => arr.concat(newItems));
          void enrich(newAddrs, generation);
        }

        cursor = page.nextCursor;
        if (!page.hasMore || cursor === null) {
          ended = true;
        }
        return ended;
      } catch (e) {
        if (generation === loadGeneration) {
          error = e instanceof Error ? e.message : String(e);
        }
        return ended;
      } finally {
        if (generation === loadGeneration) loading = false;
        nextInflight = null;
      }
    })();

    nextInflight = promise;
    return promise;
  }

  $effect(() => {
    const sdk = $circles;
    if (!group || !sdk) {
      resetState();
      groupName = null;
      return;
    }

    // Bump generation so any in-flight enrich/page callbacks become no-ops.
    ++loadGeneration;
    const generation = loadGeneration;
    resetState();

    void getProfile(group as `0x${string}`)
      .then((profile) => {
        if (generation !== loadGeneration) return;
        groupName = profile?.name ?? null;
      })
      .catch(() => {
        if (generation === loadGeneration) groupName = null;
      });

    // Pre-fetch authoritative member count so VirtualList can pre-allocate the
    // full scroll height and the header doesn't tick up as pages arrive.
    const ds = createGroupDataSource(sdk);
    void ds
      .getGroupMemberCount(group)
      .then((n) => {
        if (generation === loadGeneration && typeof n === 'number') {
          totalMemberCount = n;
        }
      })
      .catch(() => {});

    void loadNextPage();
  });

  function focusSearchInput(): void {
    const scope = listScopeEl ?? document;
    const input = scope.querySelector<HTMLInputElement>('[data-group-members-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: () =>
      Array.from(
        (listScopeEl ?? document).querySelectorAll<HTMLElement>('[data-trusted-row]')
      ),
    focusInput: focusSearchInput,
    onActivateRow: (row) => {
      const address = row.dataset.trustedAddress as Address | undefined;
      if (!address) return;
      toggleSelected(address, !get(selectedSetStore).has(address.toLowerCase()));
    },
  });

  function toggleSelected(address: Address, checked: boolean): void {
    selectedSetStore.update((prev) => {
      const next = new Set(prev);
      const key = address.toLowerCase();
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function activateRow(address: Address): void {
    toggleSelected(address, !get(selectedSetStore).has(address.toLowerCase()));
  }

  async function untrustOne(address: Address): Promise<void> {
    const sdk = get(circles);
    if (!sdk) return;

    const groupAvatar = await sdk.getAvatar(group, false);
    await runTask({
      name: `${shortenAddress(group)} untrusts ${shortenAddress(address)} ...`,
      promise: groupAvatar.trust.remove([address]),
    });

    // Optimistic remove + clear selection; indexer reconciliation happens on
    // next scroll / refresh.
    const key = address.toLowerCase();
    items.update((arr) => arr.filter((it) => it.address.toLowerCase() !== key));
    selectedSetStore.update((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (typeof totalMemberCount === 'number') {
      totalMemberCount = Math.max(0, totalMemberCount - 1);
    }
  }

  async function removeSelected(): Promise<void> {
    const sdk = get(circles);
    const selected = Array.from(get(selectedSetStore));
    if (!sdk || selected.length === 0) return;

    const groupAvatar = await sdk.getAvatar(group, false);
    await runTask({
      name: `Removing ${selected.length} trusted avatar${selected.length === 1 ? '' : 's'} from ${shortenAddress(group)} ...`,
      promise: groupAvatar.trust.remove(selected as Address[]),
    });

    const removedSet = new Set(selected.map((a) => a.toLowerCase()));
    items.update((arr) => arr.filter((it) => !removedSet.has(it.address.toLowerCase())));
    selectedSetStore.set(new Set());
    if (typeof totalMemberCount === 'number') {
      totalMemberCount = Math.max(0, totalMemberCount - removedSet.size);
    }
  }

  function openAddPopup(): void {
    openAddTrustFlow({
      context: {
        actorType: 'group',
        actorAddress: group,
        selectedTrustees: [],
      },
      onCompleted: () => {
        // After a successful add we don't yet know which addresses landed;
        // reset and reload from page 1 so new members appear at the top.
        ++loadGeneration;
        resetState();
        void loadNextPage();
      },
    });
  }

  setContext('groupMemberRowActions', {
    selectedSet: { subscribe: selectedSetStore.subscribe } as Readable<Set<string>>,
    onToggleSelected: toggleSelected,
    onUntrust: (address: Address) => void untrustOne(address),
    onActivateRow: activateRow,
    onRowKeydown: listNavigator.onRowKeydown,
  });

  const itemsReadable = derived(items, ($it) => $it);

  onDestroy(() => {
    ++loadGeneration;
  });
</script>

<div class="space-y-3" bind:this={listScopeEl}>
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold">{groupDisplayName} members</div>
      <div class="text-xs opacity-70">Manage trusted avatars for this group.</div>
    </div>
    <div class="flex items-center gap-2">
      {#if selectedCount > 0}
        <ActionButton action={removeSelected}>
          Remove {selectedCount} member{selectedCount === 1 ? '' : 's'}
        </ActionButton>
      {/if}
      <button class="btn btn-sm btn-primary" onclick={openAddPopup}>
        Add
      </button>
    </div>
  </div>

  <div class="text-xs opacity-70">
    {totalMemberCount ?? $itemsReadable.length} trusted avatar{(totalMemberCount ?? $itemsReadable.length) === 1 ? '' : 's'}
  </div>

  <div role="group" aria-label="Search trusted avatars">
    <SearchablePaginatedList
      items={itemsReadable}
      row={GroupMemberRow}
      getKey={(item: GroupMemberItem) => String(item.address)}
      addressOf={(item: GroupMemberItem) => String(item.address)}
      placeholderRow={AvatarRowPlaceholder}
      inputDataAttribute="data-group-members-search-input"
      {loading}
      {error}
      next={loadNextPage}
      {ended}
      rowHeight={64}
      pageSize={PAGE_SIZE}
      totalKnownCount={totalMemberCount}
      emptyLabel="No trusted avatars"
      noMatchesLabel="No matches"
    />
  </div>
</div>
