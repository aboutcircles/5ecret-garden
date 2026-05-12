<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { Address } from '@circles-sdk/utils';
  import { circles } from '$lib/shared/state/circles';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { getProfileDisplayName } from '$lib/areas/groups/ui/utils/profileDisplayName';
  import GroupMembersManager from '$lib/areas/groups/ui/components/GroupMembersManager.svelte';

  const group = $derived(($page.params.group ?? '').toLowerCase() as Address | '');
  const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
  let groupName: string = $state('');

  const groupTitle = $derived(
    group
      ? `${groupName || shortAddr(group)} members`
      : 'Group members'
  );

  $effect(() => {
    const sdk = $circles;
    let cancelled = false;
    if (!group) {
      groupName = '';
      return;
    }

    if (!sdk) {
      // Retry automatically once SDK becomes available.
      return;
    }

    void getProfileDisplayName(group)
      .then((name) => {
        if (cancelled) return;
        groupName = name;
      })
      .catch(() => {
        if (cancelled) return;
        groupName = '';
      });

    return () => {
      cancelled = true;
    };
  });

  function backToOverview() {
    goto('/groups');
  }

  const actions: Action[] = $derived([
    {
      id: 'back-overview',
      label: 'Back',
      variant: 'ghost',
      onClick: backToOverview,
    },
    {
      id: 'open-metrics',
      label: 'Stats',
      variant: 'ghost',
      onClick: () => {
        if (!group) return;
        goto(`/groups/metrics/${group}`);
      },
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
    <h1 class="h2">{groupTitle}</h1>
  {/snippet}

  {#snippet meta()}
    {#if group}
      <span class="text-xs opacity-70">{shortAddr(group)}</span>
    {:else}
      <span class="text-xs opacity-70">Missing group address.</span>
    {/if}
  {/snippet}

  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}

  {#snippet collapsedLeft()}
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      {groupTitle}
    </span>
  {/snippet}

  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}

  {#if group}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <GroupMembersManager group={group} />
    </section>
  {:else}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <div class="text-sm opacity-70">Invalid group route.</div>
    </section>
  {/if}
</PageScaffold>
