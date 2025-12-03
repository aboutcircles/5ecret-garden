<script lang="ts">
    import GenericList from '$lib/components/GenericList.svelte';
    import {createCMGroups} from '$lib/stores/groups.svelte';
    import type {Readable} from 'svelte/store';
    import type {EventRow} from '@circles-sdk/data';
    import GroupRowView from './GroupRowView.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
    import type {Action} from '$lib/components/layout/Action';

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

    const actions: Action[] = [];
</script>

<PageScaffold highlight="soft"
              collapsedMode="bar"
              collapsedHeightClass="h-12"
              maxWidthClass="page page--lg"
              contentWidthClass="page page--lg"
              usePagePadding={true}
              headerTopGapClass="mt-4 md:mt-6"
              collapsedTopGapClass="mt-3 md:mt-4">
    <svelte:fragment slot="title">
        <h1 class="h2">Groups</h1>
    </svelte:fragment>
    <svelte:fragment slot="meta">
        and Communities
    </svelte:fragment>
    <svelte:fragment slot="actions">
        <ActionButtonBar {actions}/>
    </svelte:fragment>
    <svelte:fragment slot="collapsed-left">
  <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Groups
  </span>
    </svelte:fragment>
    <svelte:fragment slot="collapsed-menu">
        <ActionButtonDropDown {actions}/>
    </svelte:fragment>

    <GenericList store={groups} row={GroupRowView} rowHeight={64} maxPlaceholderPages={2} expectedPageSize={25} />
</PageScaffold>
