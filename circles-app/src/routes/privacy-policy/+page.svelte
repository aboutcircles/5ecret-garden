<script lang="ts">
  import Privacy from './privacy.svx';
  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
</script>

<PageScaffold
    highlight="soft"
    maxWidthClass="page page--lg"
    contentWidthClass="page page--lg"
    usePagePadding={true}
    collapsedMode="bar"
    collapsedHeightClass="h-12"
    headerTopGapClass="mt-4 md:mt-6"
    collapsedTopGapClass="mt-3 md:mt-4"
>
  {#snippet title()}
    <h2 class="h2 m-0">Privacy policy</h2>
  {/snippet}

  <div
      class="prose md:prose-lg max-w-3xl mx-auto px-4 md:px-6 pb-24 md:pb-32 leading-relaxed prose-headings:font-semibold prose-headings:leading-tight prose-a:underline-offset-2 hover:prose-a:underline prose-p:my-3 prose-li:my-1.5">
    <Privacy/>
  </div>
</PageScaffold>
