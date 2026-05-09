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
    <h1 class="h2 m-0">Avatar Search Dev Workspace</h1>
  {/snippet}

  {#snippet meta()}
    Unified list planning and staged implementation
  {/snippet}

  <section style="border-radius:12px;border:1px solid rgba(31,17,70,0.05);background:#FFFFFF;padding:16px;">
    <p style="font-size:14px;color:rgba(15,10,30,0.62);margin:0;">
      This sub-route keeps development assets close to the new route during iterative implementation.
    </p>
    <p style="font-size:14px;color:rgba(15,10,30,0.40);margin-top:8px;margin-bottom:0;">
      See <code>src/routes/avatar-search/dev/PLAN.md</code> for architecture and rollout plan.
    </p>
  </section>

  <section style="margin-top:16px;border-radius:12px;border:1px solid rgba(31,17,70,0.05);background:#FFFFFF;padding:16px;">
    <AvatarSearchList />
  </section>
</PageScaffold>
