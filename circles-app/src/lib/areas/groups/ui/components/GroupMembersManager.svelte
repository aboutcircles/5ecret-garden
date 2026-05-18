<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import { circles } from '$lib/shared/state/circles';
  import { get, writable } from 'svelte/store';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { getProfile } from '$lib/shared/utils/profile';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
  import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';
  import { createGroupDataSource } from '$lib/shared/data/circles/groupDataSource';

  interface Props {
    group: Address;
  }

  let { group }: Props = $props();
  let loading: boolean = $state(false);
  let error: string | null = $state(null);
  let trusted: Address[] = $state([]);
  let trustedAvatarTypes: Record<string, string | undefined> = $state({});
  let selectedSet: Set<Address> = $state(new Set<Address>());
  let groupName: string | null = $state(null);
  let searchInputEl: HTMLInputElement | null = $state(null);
  let trustedListEl: HTMLDivElement | null = $state(null);
  const trustedStore = writable<Address[]>([]);

  const searchable = createSearchablePaginatedList(trustedStore, {
    pageSize: 50,
    addressOf: (addr) => addr,
  });
  const { searchQuery, filteredItems } = searchable;

  const selectedMembers = $derived(Array.from(selectedSet));
  const selectedCount = $derived(selectedMembers.length);
  const groupDisplayName = $derived(
    ((groupName ?? '') as string).length > 0
      ? ((groupName ?? '') as string)
      : shortenAddress(group)
  );

  function avatarTypeToReadable(type?: string): string {
    if (type === 'CrcV2_RegisterHuman') return 'Human';
    if (type === 'CrcV2_RegisterOrganization') return 'Organization';
    if (type === 'CrcV2_RegisterGroup') return 'Group';
    return 'Unknown';
  }

  $effect(() => {
    const sdk = $circles;
    let cancelled = false;
    if (!group) {
      groupName = null;
      return;
    }

    if (!sdk) {
      // Retry automatically once SDK becomes available.
      return;
    }

    void getProfile(group as `0x${string}`)
      .then((profile) => {
        if (cancelled) return;
        groupName = profile?.name ?? null;
      })
      .catch(() => {
        if (cancelled) return;
        groupName = null;
      });

    return () => {
      cancelled = true;
    };
  });

  const GROUP_MEMBERS_PAGE_SIZE = 100;
  let loadGeneration = 0;

  async function loadTrusted() {
    const sdk = get(circles);
    if (!sdk) {
      trusted = [];
      trustedAvatarTypes = {};
      return;
    }

    const generation = ++loadGeneration;
    loading = true;
    error = null;
    trusted = [];
    trustedAvatarTypes = {};
    trustedStore.set([]);

    try {
      const groupDataSource = createGroupDataSource(sdk);
      const avatarDataSource = createAvatarDataSource(sdk);
      const seen = new Set<string>();
      let cursor: string | null = null;
      let first = true;

      do {
        const page = await groupDataSource.getGroupMembersPage(
          group,
          cursor,
          GROUP_MEMBERS_PAGE_SIZE
        );
        if (generation !== loadGeneration) return;

        const newAddrs: Address[] = [];
        for (const row of page.results) {
          const addr = row.member as Address;
          const key = addr.toLowerCase();
          if (key === group.toLowerCase()) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          newAddrs.push(addr);
        }

        if (newAddrs.length > 0) {
          trusted = trusted.concat(newAddrs);
          trustedStore.set(trusted);

          // Enrich this page's addresses with avatar types in the background;
          // rows render immediately and the type label fills in when ready.
          void (async () => {
            try {
              const infos = await avatarDataSource.getAvatarInfoBatch(newAddrs);
              if (generation !== loadGeneration) return;
              const next: Record<string, string | undefined> = { ...trustedAvatarTypes };
              for (const info of infos) {
                if (info) next[String(info.avatar).toLowerCase()] = info.type;
              }
              trustedAvatarTypes = next;
            } catch (e) {
              console.debug('[GroupMembersManager] avatar info batch failed', e);
            }
          })();
        }

        if (first) {
          loading = false;
          first = false;
        }
        cursor = page.nextCursor;
      } while (cursor);
    } catch (e) {
      if (generation !== loadGeneration) return;
      error = e instanceof Error ? e.message : String(e);
      trusted = [];
      trustedAvatarTypes = {};
      trustedStore.set([]);
    } finally {
      if (generation === loadGeneration) loading = false;
    }
  }

  $effect(() => {
    const sdk = $circles;

    if (!group || !sdk) {
      trusted = [];
      trustedAvatarTypes = {};
      trustedStore.set([]);
      return;
    }

    void loadTrusted();
  });

  function toggleSelected(address: Address, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(address);
    } else {
      next.delete(address);
    }
    selectedSet = next;
  }

  function onToggleSelectedFromCheckbox(address: Address, event: Event) {
    const el = event.currentTarget as HTMLInputElement | null;
    toggleSelected(address, Boolean(el?.checked));
  }

  function focusSearchInput() {
    searchInputEl?.focus();
  }

  const trustedListNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(trustedListEl?.querySelectorAll<HTMLElement>('[data-trusted-row]') ?? []),
    focusInput: focusSearchInput,
    onActivateRow: (row) => {
      const address = row.dataset.trustedAddress as Address | undefined;
      if (!address) return;
      toggleSelected(address, !selectedSet.has(address));
    },
  });

  function onTrustedRowClick(event: MouseEvent) {
    trustedListNavigator.onRowClick(event);
  }

  async function getDisplayName(address: Address): Promise<string> {
    try {
      const profile = await getProfile(address as `0x${string}`);
      const name = profile?.name?.trim();
      return name && name.length > 0 ? name : shortenAddress(address);
    } catch {
      return shortenAddress(address);
    }
  }

  async function untrustOne(address: Address) {
    const sdk = get(circles);
    if (!sdk) return;

    const groupAvatar = await sdk.getAvatar(group, false);
    await runTask({
      name: `${shortenAddress(group)} untrusts ${shortenAddress(address)} ...`,
      promise: groupAvatar.trust.remove([address]),
    });

    const next = new Set(selectedSet);
    next.delete(address);
    selectedSet = next;
    await loadTrusted();
  }

  function openAddPopup() {
    openAddTrustFlow({
      context: {
        actorType: 'group',
        actorAddress: group,
        selectedTrustees: [],
      },
      onCompleted: async () => {
        await loadTrusted();
      },
    });
  }

  async function removeSelected() {
    const sdk = get(circles);
    if (!sdk || selectedMembers.length === 0) return;

    // No event subscription needed for one-off mutating action.
    const groupAvatar = await sdk.getAvatar(group, false);
    await runTask({
      name: `Removing ${selectedMembers.length} trusted avatar${selectedMembers.length === 1 ? '' : 's'} from ${shortenAddress(group)} ...`,
      promise: groupAvatar.trust.remove(selectedMembers),
    });

    selectedSet = new Set<Address>();
    await loadTrusted();
  }
</script>

<div class="space-y-3">
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

  <div class="text-xs opacity-70">{trusted.length} trusted avatar{trusted.length === 1 ? '' : 's'}</div>

  <div role="group" aria-label="Search trusted avatars">
    <ListShell
      query={searchQuery}
      searchPlaceholder="Search by address or name"
      bind:inputEl={searchInputEl}
      onInputKeydown={trustedListNavigator.onInputArrowDown}
      {loading}
      {error}
      isEmpty={trusted.length === 0}
      isNoMatches={trusted.length > 0 && $filteredItems.length === 0}
      emptyLabel="No trusted avatars"
      noMatchesLabel="No matches"
      wrapInListContainer={false}
    >
      <div bind:this={trustedListEl} class="w-full flex flex-col gap-y-1.5" role="list">
        {#each $filteredItems as address (address)}
          <div
            tabindex={0}
            data-trusted-row
            data-trusted-address={address}
            onkeydown={trustedListNavigator.onRowKeydown}
            onclick={onTrustedRowClick}
            role="button"
            aria-pressed={selectedSet.has(address) ? 'true' : 'false'}
            aria-label={`Trusted member ${address}`}
            class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RowFrame clickable={false} dense={true} noLeading={true}>
              <div class="min-w-0">
                <Avatar
                  address={address}
                  view="horizontal"
                  clickable={true}
                  bottomInfo={`${avatarTypeToReadable(trustedAvatarTypes[address.toLowerCase()])} • ${address}`}
                />
              </div>
              {#snippet trailing()}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error/80 hover:text-error"
                    aria-label="Untrust"
                    title="Untrust"
                    onclick={(event) => {
                      event.stopPropagation();
                      void untrustOne(address);
                    }}
                  >
                    <img src="/trash.svg" alt="" class="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={selectedSet.has(address)}
                    onchange={(e) => onToggleSelectedFromCheckbox(address, e)}
                  />
                </div>
              {/snippet}
            </RowFrame>
          </div>
        {/each}
      </div>
    </ListShell>
  </div>
</div>

