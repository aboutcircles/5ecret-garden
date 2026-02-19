<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import { circles } from '$lib/shared/state/circles';
  import { get, writable } from 'svelte/store';
  import { popupControls } from '$lib/shared/state/popup';
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
  import { createTrustDataSource } from '$lib/shared/data/circles/trustDataSource';
  import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';
  import GroupTrustConfirmDialog from './GroupTrustConfirmDialog.svelte';

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

  function avatarInfoFor(address: Address) {
    const type = trustedAvatarTypes[address.toLowerCase()];
    return type ? ({ avatar: address, type } as any) : undefined;
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

    void getProfile(group)
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

  async function loadTrusted() {
    const sdk = get(circles);
    if (!sdk) {
      trusted = [];
      trustedAvatarTypes = {};
      return;
    }

    loading = true;
    error = null;
    try {
      const trustDataSource = createTrustDataSource(sdk);
      const avatarDataSource = createAvatarDataSource(sdk);
      const relations = await trustDataSource.getAggregatedTrustRelations(group);
      const trustedAddresses = Array.from(
        new Set(
          relations
            .filter((row) => row.relation === 'trusts' || row.relation === 'mutuallyTrusts')
            .map((row) => row.objectAvatar as Address)
            .filter((addr) => addr.toLowerCase() !== group.toLowerCase())
        )
      ).sort((a, b) => a.localeCompare(b));
      trusted = trustedAddresses;
      trustedStore.set(trusted);

      const infos = await avatarDataSource.getAvatarInfoBatch(trustedAddresses);
      const nextTypes: Record<string, string | undefined> = {};
      for (const info of infos) {
        nextTypes[String(info.avatar).toLowerCase()] = info.type;
      }
      trustedAvatarTypes = nextTypes;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      trusted = [];
      trustedAvatarTypes = {};
      trustedStore.set([]);
    } finally {
      loading = false;
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
      const profile = await getProfile(address);
      const name = profile?.name?.trim();
      return name && name.length > 0 ? name : shortenAddress(address);
    } catch {
      return shortenAddress(address);
    }
  }

  async function openTrust(address: Address) {
    const displayName = await getDisplayName(address);
    popupControls.open({
      title: `Trust ${displayName}`,
      component: GroupTrustConfirmDialog,
      props: {
        group,
        address,
        onTrusted: async () => {
          await loadTrusted();
        },
      },
    });
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

    const groupAvatar = await sdk.getAvatar(group);
    await runTask({
      name: `Removing ${selectedMembers.length} trusted avatar${selectedMembers.length === 1 ? '' : 's'} from ${shortenAddress(group)} ...`,
      promise: groupAvatar.untrust(selectedMembers),
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
                  avatarInfo={avatarInfoFor(address)}
                  view="horizontal"
                  clickable={true}
                  bottomInfo={`${avatarTypeToReadable(trustedAvatarTypes[address.toLowerCase()])} • ${address}`}
                />
              </div>
              {#snippet trailing()}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    onclick={(event) => {
                      event.stopPropagation();
                      void openTrust(address);
                    }}
                  >
                    Trust
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

