<script lang="ts">
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import { T } from '$lib/design-system/tokens.js';
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
    <h1 class="h2 m-0">Avatar Search (Dev)</h1>
  {/snippet}

  {#snippet meta()}
    Unified avatar search list test route
  {/snippet}

  <section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;">
    <p style="font-size:13px;color:{T.inkBody};margin:0;">
      This route is the isolated development area for the new unified avatar search list.
    </p>
    <p style="font-size:13px;color:{T.inkMuted};margin-top:8px;margin-bottom:0;">
      Planning and implementation notes live in <code>src/routes/avatar-search/dev/PLAN.md</code>.
    </p>
    <div style="margin-top:12px;">
      <a style="display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;text-decoration:none;font-size:13px;font-weight:580;" href="/avatar-search/dev">Open development sub-route</a>
    </div>
  </section>
</PageScaffold>
