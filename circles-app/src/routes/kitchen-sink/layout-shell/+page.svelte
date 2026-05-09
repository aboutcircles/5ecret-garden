<script lang="ts">
  import { Plus as LPlus, RefreshCw as LRefreshCw } from 'lucide';

  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { T } from '$lib/design-system/tokens';

  const shellActionItems: Action[] = [
    { id: 'refresh', label: 'Refresh', iconNode: LRefreshCw, variant: 'ghost', onClick: () => {} },
    { id: 'create', label: 'Create', iconNode: LPlus, variant: 'primary', onClick: () => {} }
  ];
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Layout & Shell</h2>
  <p style="font-size:13px;color:{T.inkMuted};margin:0;">
    Demonstrates shell-level composition with <code>PageScaffold</code>, <code>FlowDecoration</code>, and
    <code>RowFrame</code> variants.
  </p>

  <div style="border-radius:14px;border:1px solid {T.hairlineSoft};padding:12px 0;background:{T.pageDeep};">
    <PageScaffold
      maxWidthClass="max-w-4xl"
      contentWidthClass="max-w-4xl"
      highlight="tint"
      collapsedMode="bar"
    >
      {#snippet title()}
        <h3 style="font-size:18px;font-weight:580;margin:0;">Shell demo: account dashboard</h3>
      {/snippet}

      {#snippet meta()}
        Responsive scaffold header with expanded and collapsed action controls.
      {/snippet}

      {#snippet headerActions()}
        <ActionButtonBar actions={shellActionItems} />
      {/snippet}

      {#snippet collapsedMenu()}
        <ActionButtonDropDown actions={shellActionItems} />
      {/snippet}

      <FlowDecoration size="md">
        <div style="display:flex;flex-direction:column;gap:8px;">
          <h4 style="font-size:13px;font-weight:500;margin:0;">RowFrame variants</h4>

          <RowFrame clickable={true}>
            {#snippet leading()}<div class="avatar placeholder"><div class="bg-neutral text-neutral-content rounded-full w-8"><span>U</span></div></div>{/snippet}
            {#snippet title()}Default row{/snippet}
            {#snippet subtitle()}Leading + title/subtitle/meta + trailing{/snippet}
            {#snippet meta()}Meta information{/snippet}
            {#snippet trailing()}<button style="height:26px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:11.5px;font-weight:540;cursor:pointer;">Action</button>{/snippet}
          </RowFrame>

          <RowFrame dense={true} selected={true}>
            {#snippet title()}Dense + selected row{/snippet}
            {#snippet subtitle()}Useful for compact list contexts{/snippet}
            {#snippet trailing()}<span style="display:inline-block;background:rgba(88,73,212,0.12);color:{T.primaryDeep};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:580;">Selected</span>{/snippet}
          </RowFrame>

          <RowFrame noLeading={true} clickable={true}>
            <div class="w-full flex items-center justify-between gap-3">
              <div>
                <div style="font-weight:500;">Custom content row (no leading column)</div>
                <div style="font-size:11.5px;color:{T.inkMuted};">For rows that already include full internal layout.</div>
              </div>
              <button style="height:26px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11.5px;font-weight:540;cursor:pointer;">More</button>
            </div>
          </RowFrame>
        </div>

        <div style="font-size:13px;color:{T.inkMuted};padding-top:8px;">
          Scroll this page down to trigger the scaffold’s collapsed header mode and quick-actions tray.
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          {#each Array.from({ length: 6 }) as _, i}
            <div style="border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:12px;font-size:13px;color:{T.inkMuted};">
              Filler content block {i + 1} — used to test sticky/collapsed shell behavior while scrolling.
            </div>
          {/each}
        </div>
      </FlowDecoration>
    </PageScaffold>
  </div>
</section>
