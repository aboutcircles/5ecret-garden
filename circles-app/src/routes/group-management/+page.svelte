<script lang="ts">
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { popupControls } from '$lib/shared/state/popup';
  import { circles } from '$lib/shared/state/circles';
  import { signer } from '$lib/shared/state/wallet.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import type { Address } from '@circles-sdk/utils';
  import type { GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
  import ManagedGroupRow from './ManagedGroupRow.svelte';
  import ManageGroupMembers from '$lib/areas/groups/flows/manageGroupMembers/1_manageGroupMembers.svelte';
  import GroupSettingsPrototype from './GroupSettingsPrototype.svelte';
  import { goto } from '$app/navigation';
  import { getGroupsByMember } from '$lib/shared/utils/getGroupsByMemberBatch';

  let loading: boolean = $state(false);
  let error: string | null = $state(null);
  let ownedGroups: GroupRow[] = $state([]);
  let membershipsLoading: boolean = $state(false);
  let membershipsError: string | null = $state(null);
  let memberships: GroupRow[] = $state([]);

  const ownerAddress = $derived(
    (avatarState.isGroup
      ? ''
      : (
          (CirclesStorage.getInstance().avatar as Address | undefined) ??
          (avatarState.avatar?.address as Address | undefined) ??
          (signer.address as Address | undefined) ??
          ''
        )) as Address | ''
  );
  const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

  async function loadOwnedGroups(): Promise<void> {
    if (!$circles || !ownerAddress) {
      ownedGroups = [];
      return;
    }

    try {
      loading = true;
      error = null;
      const rowsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [ownerAddress]);
      ownedGroups = rowsByOwner[ownerAddress.toLowerCase() as Address] ?? rowsByOwner[ownerAddress] ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      ownedGroups = [];
    } finally {
      loading = false;
    }
  }

  async function loadMemberships(): Promise<void> {
    if (!$circles || !ownerAddress) {
      memberships = [];
      return;
    }
    try {
      membershipsLoading = true;
      membershipsError = null;
      memberships = await getGroupsByMember($circles, ownerAddress);
    } catch (e) {
      membershipsError = e instanceof Error ? e.message : String(e);
      memberships = [];
    } finally {
      membershipsLoading = false;
    }
  }

  $effect(() => {
    void loadOwnedGroups();
    void loadMemberships();
  });

  function openManageMembers(group: string) {
    popupControls.open({
      title: `Manage members ${shortAddr(group)}`,
      component: ManageGroupMembers,
      props: {},
    });
  }

  function openGroupSettings(group: string) {
    popupControls.open({
      title: `Group settings ${shortAddr(group)}`,
      component: GroupSettingsPrototype,
      props: { group },
    });
  }

  function openStats(group: string) {
    goto(`/groups/metrics/${group}`);
  }

  const actions: Action[] = $derived([
    {
      id: 'refresh-groups',
      label: 'Refresh',
      variant: 'ghost',
      onClick: () => {
        void loadOwnedGroups();
        void loadMemberships();
      },
    },
    {
      id: 'open-groups-route',
      label: 'Open groups route',
      variant: 'ghost',
      onClick: () => goto('/groups'),
    },
  ]);
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
    <h1 class="h2">Group management</h1>
  {/snippet}

  {#snippet meta()}
    {#if avatarState.isGroup}
      <span class="text-xs opacity-70">Connected as group avatar — owner-scoped group management is disabled.</span>
    {:else if ownerAddress}
      <span class="text-xs opacity-70">Connected owner {shortAddr(ownerAddress)}</span>
    {:else}
      <span class="text-xs opacity-70">Connect a wallet/avatar first.</span>
    {/if}
  {/snippet}

  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}

  {#snippet collapsedLeft()}
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Group management
    </span>
  {/snippet}

  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}

  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full space-y-2">
    <h3 class="text-sm font-semibold m-0">Prototype scope</h3>
    <p class="text-xs opacity-75 m-0">
      This route prototypes owner-centric group management without switching the whole app into group mode.
      New files for this prototype are intentionally kept in <code>src/routes/group-management</code>.
    </p>
  </section>

  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold m-0">Owned groups</h3>
      {#if loading}
        <span class="loading loading-spinner loading-sm"></span>
      {/if}
    </div>

    {#if !ownerAddress}
      <div class="text-sm opacity-70">Connect a wallet/avatar to load owned groups.</div>
    {:else if error}
      <div class="alert alert-warning text-sm">
        <span>{error}</span>
      </div>
    {:else if ownedGroups.length === 0}
      <div class="text-sm opacity-70">No owned groups found for this owner.</div>
    {:else}
      <div class="w-full flex flex-col gap-y-1.5 py-2" role="list">
        {#each ownedGroups as item (item.group)}
          <ManagedGroupRow
            {item}
            onManageMembers={openManageMembers}
            onManageSettings={openGroupSettings}
            onOpenStats={openStats}
          />
        {/each}
      </div>
    {/if}
  </section>

  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full space-y-2">
    <h3 class="text-sm font-semibold m-0">Memberships (reference)</h3>
    {#if membershipsLoading}
      <div class="loading loading-spinner loading-sm"></div>
    {:else if membershipsError}
      <div class="alert alert-warning text-sm"><span>{membershipsError}</span></div>
    {:else if memberships.length === 0}
      <div class="text-sm opacity-70">No memberships found.</div>
    {:else}
      <div class="text-xs opacity-80">
        {memberships.length} group membership{memberships.length === 1 ? '' : 's'} for connected owner.
      </div>
    {/if}
  </section>
</PageScaffold>
