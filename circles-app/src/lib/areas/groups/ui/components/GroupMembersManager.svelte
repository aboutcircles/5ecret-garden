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
  import { removeGroupMembers } from '$lib/shared/utils/trustActions';
  import { probeGroupCapabilities } from '$lib/areas/groups/utils/groupKind';
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

  // Whether the on-chain contract for this group supports owner-initiated
  // member removal. `simple` (ScoreGroup) shapes don't — for those, members
  // leave via optOut() only and the remove UI must be hidden. Backed by a
  // store so the row context can subscribe reactively (rows mount before
  // the probe resolves).
  const ownerRemoveSupportedStore = writable<boolean>(false);
  let ownerRemoveSupported: boolean = $state(false);
  ownerRemoveSupportedStore.subscribe((v) => {
    ownerRemoveSupported = v;
  });
  let capsLoaded: boolean = $state(false);

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

  // Dedup guard for the init $effect. The `circles` store re-emits on every
  // SDK lifecycle tick (new event subscriptions, balance updates, etc.) which
  // would otherwise re-trigger the effect and wipe `totalMemberCount` /
  // `items` mid-render — surfacing as a "0 ↔ 2820 trusted avatars" flicker.
  // Only re-init when the group address or the SDK *instance* actually changes.
  let initializedForGroup: string = '';
  let initializedForSdkRef: unknown = null;

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

    // Split the two fetches so a failure in one doesn't drop the other half —
    // rows then still render whatever data we did get instead of stuck on
    // "Unknown" type and the address fallback.
    let profiles: Map<ProfileAddress, any> = new Map();
    let typeMap: Map<string, string> = new Map();

    try {
      profiles = await getProfilesCoreBatch(
        addrs.map((a) => a.toLowerCase()) as ProfileAddress[]
      );
    } catch (e) {
      console.warn('[GroupMembersManager] profile prefetch failed', e);
    }

    try {
      const infos = await createAvatarDataSource(sdk).getAvatarInfoBatch(addrs);
      for (const info of infos) {
        if (info) typeMap.set(String(info.avatar).toLowerCase(), info.type);
      }
    } catch (e) {
      console.warn('[GroupMembersManager] avatar-info prefetch failed', e);
    }

    if (generation !== loadGeneration) return;
    if (profiles.size === 0 && typeMap.size === 0) return;

    items.update((current) =>
      current.map((it) => {
        const key = it.address.toLowerCase();
        const nextProfile = profiles.get(key as ProfileAddress) ?? it.profile;
        const nextType = typeMap.get(key) ?? it.avatarType;
        if (nextProfile === it.profile && nextType === it.avatarType) return it;
        return { ...it, profile: nextProfile, avatarType: nextType };
      })
    );
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
      }
    })();

    nextInflight = promise;
    // Only release the single-flight slot if it still points at our promise.
    // After a group switch, a newer page-1 fetch may have replaced this slot;
    // clearing it unconditionally would let the next caller race a duplicate.
    void promise.finally(() => {
      if (nextInflight === promise) nextInflight = null;
    });
    return promise;
  }

  $effect(() => {
    const sdk = $circles;
    const groupKey = group ? String(group).toLowerCase() : '';

    if (!groupKey || !sdk) {
      if (initializedForGroup !== '') {
        initializedForGroup = '';
        initializedForSdkRef = null;
        resetState();
        groupName = null;
      }
      return;
    }

    // Bail if we've already initialized for this group + SDK pair. Without
    // this, every `circles` store re-emit (which fires often during normal
    // SDK lifecycle) would reset `totalMemberCount` to undefined and clear
    // `items`, producing a "0 ↔ N trusted avatars" flicker on the count badge
    // until the count fetch resolves again.
    if (groupKey === initializedForGroup && sdk === initializedForSdkRef) {
      return;
    }
    initializedForGroup = groupKey;
    initializedForSdkRef = sdk;

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
      .catch((e) => {
        console.warn('[GroupMembersManager] member-count fetch failed', e);
      });

    // Probe the group contract for trust capabilities. Three on-chain shapes
    // exist (BaseGroup-with-conditions, CMG-with-expiry, simple ScoreGroup);
    // the indexer reports them all as CrcV2_RegisterGroup so the SDK can't
    // tell them apart. `simple` shapes have no owner-side remove — UI hides
    // remove actions for those.
    capsLoaded = false;
    ownerRemoveSupportedStore.set(false);
    void probeGroupCapabilities(group as string)
      .then((caps) => {
        if (generation === loadGeneration) {
          ownerRemoveSupportedStore.set(caps.ownerRemove);
          capsLoaded = true;
        }
      })
      .catch((e) => {
        console.warn('[GroupMembersManager] capabilities probe failed', e);
        if (generation === loadGeneration) capsLoaded = true;
      });

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
    if (!ownerRemoveSupported) return;

    // Snapshot identity at call time. Group switches can happen mid-tx;
    // without this, the optimistic mutation would land on the new group's
    // local state.
    const snapGroup = group;
    const snapGeneration = loadGeneration;

    // removeGroupMembers selects the right calldata (trustBatchWithConditions
    // or trustBatch+expiry) based on the group contract shape, with
    // expiry=0. The SDK's `trust.remove` builds `trust(address, uint96)`
    // which doesn't exist on CMG variants — that was the prior revert.
    await removeGroupMembers(snapGroup, [address]);

    if (loadGeneration !== snapGeneration || group !== snapGroup) return;

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
    if (!ownerRemoveSupported) return;
    const selectedKeys = Array.from(get(selectedSetStore));
    if (selectedKeys.length === 0) return;

    // Resolve original-cased addresses from the loaded items so we don't pass
    // lowercased keys (with potentially broken checksums) into the SDK call.
    const snapshot = get(items);
    const addrByKey = new Map(
      snapshot.map((it) => [it.address.toLowerCase(), it.address as Address])
    );
    const addresses = selectedKeys
      .map((k) => addrByKey.get(k))
      .filter((a): a is Address => Boolean(a));
    if (addresses.length === 0) return;

    const snapGroup = group;
    const snapGeneration = loadGeneration;

    await removeGroupMembers(snapGroup, addresses);

    if (loadGeneration !== snapGeneration || group !== snapGroup) return;

    const removedSet = new Set(selectedKeys);
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
        const generation = loadGeneration;
        resetState();

        // Re-fetch authoritative count so the badge doesn't fall back to
        // a growing $items.length while pages stream in.
        const sdk = get(circles);
        if (sdk) {
          void createGroupDataSource(sdk)
            .getGroupMemberCount(group)
            .then((n) => {
              if (generation === loadGeneration && typeof n === 'number') {
                totalMemberCount = n;
              }
            })
            .catch((e) => {
              console.warn('[GroupMembersManager] member-count refetch failed', e);
            });
        }
        void loadNextPage();
      },
    });
  }

  setContext('groupMemberRowActions', {
    selectedSet: { subscribe: selectedSetStore.subscribe } as Readable<Set<string>>,
    canRemove: { subscribe: ownerRemoveSupportedStore.subscribe } as Readable<boolean>,
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
      {#if ownerRemoveSupported && selectedCount > 0}
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

  {#if capsLoaded && !ownerRemoveSupported}
    <div class="text-xs opacity-70 rounded border border-base-300/60 bg-base-200/40 px-2 py-1">
      This group's contract has no owner-side remove. Members leave via Opt-out from their Memberships page.
    </div>
  {/if}

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
