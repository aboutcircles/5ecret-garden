<script lang="ts">
  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
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
    <h1 class="h2 m-0">Avatar Search (Dev)</h1>
  {/snippet}

  {#snippet meta()}
    Unified avatar search list test route
  {/snippet}

  <section class="rounded-xl border border-base-300 bg-base-100 p-4">
    <p class="text-sm text-base-content/80 m-0">
      This route is the isolated development area for the new unified avatar search list.
    </p>
    <p class="text-sm text-base-content/60 mt-2 mb-0">
      Planning and implementation notes live in <code>src/routes/avatar-search/dev/PLAN.md</code>.
    </p>
    <div class="mt-3">
      <a class="btn btn-sm btn-primary" href="/avatar-search/dev">Open development sub-route</a>
    </div>
  </section>
</PageScaffold>
