<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import AvatarSearchList from './AvatarSearchList.svelte';
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
    <h1 class="h2 m-0">Avatar Search Dev Workspace</h1>
  {/snippet}

  {#snippet meta()}
    Unified list planning and staged implementation
  {/snippet}

  <section class="rounded-xl border border-base-300 bg-base-100 p-4">
    <p class="text-sm text-base-content/80 m-0">
      This sub-route keeps development assets close to the new route during iterative implementation.
    </p>
    <p class="text-sm text-base-content/60 mt-2 mb-0">
      See <code>src/routes/avatar-search/dev/PLAN.md</code> for architecture and rollout plan.
    </p>
  </section>

  <section class="mt-4 rounded-xl border border-base-300 bg-base-100 p-4">
    <AvatarSearchList />
  </section>
</PageScaffold>
