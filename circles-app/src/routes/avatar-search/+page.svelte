<script lang="ts">
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import AvatarSearchList from './dev/AvatarSearchList.svelte';
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

  <section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;">
    <AvatarSearchList />
  </section>
</PageScaffold>
