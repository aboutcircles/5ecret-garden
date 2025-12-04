<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import { page } from '$app/stores';
  import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/components/layout/Action';

  // This route is deprecated: do not pass order keys in URLs. We keep this page
  // only to show a notice and guide users to the Orders list.
  const _legacyParam: string | null = $derived($page.params?.id ?? null);

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
    <h1 class="h2">Order Lookup Deprecated</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    <span class="text-xs opacity-80">Direct access by URL is disabled</span>
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <ActionButtonBar {actions} />
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">Order</span>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    <ActionButtonDropDown {actions} />
  </svelte:fragment>

  <div class="alert alert-warning my-2">
    <span>
      The legacy order details URL is no longer supported because it exposed a secret capability.
      Please use the Orders page to view your orders when signed in.
    </span>
  </div>
</PageScaffold>
