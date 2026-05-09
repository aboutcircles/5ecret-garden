<script lang="ts">
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import AvatarSearchList from './AvatarSearchList.svelte';
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
>
  {#snippet title()}
    <h1 class="h2 m-0">Avatar search</h1>
  {/snippet}

  {#snippet meta()}
    Search avatars across the network
  {/snippet}

  <section style="border-radius:12px;border:1px solid rgba(31,17,70,0.05);background:#FFFFFF;padding:16px;">
    <AvatarSearchList />
  </section>
</PageScaffold>
