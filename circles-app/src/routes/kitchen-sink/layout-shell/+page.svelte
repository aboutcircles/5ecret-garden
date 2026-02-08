<script lang="ts">
  import { Plus as LPlus, RefreshCw as LRefreshCw } from 'lucide';

  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
  import ActionButtonBar from '$lib/app/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/app/shell/ActionButtonDropDown.svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import type { Action } from '$lib/types/actions';

  const shellActionItems: Action[] = [
    { id: 'refresh', label: 'Refresh', iconNode: LRefreshCw, variant: 'ghost', onClick: () => {} },
    { id: 'create', label: 'Create', iconNode: LPlus, variant: 'primary', onClick: () => {} }
  ];
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Layout & Shell</h2>
  <p class="text-sm opacity-70">
    Demonstrates shell-level composition with <code>PageScaffold</code>, <code>FlowDecoration</code>, and
    <code>RowFrame</code> variants.
  </p>

  <div class="rounded-xl border border-base-300 bg-base-200/20 py-3">
    <PageScaffold
      maxWidthClass="max-w-4xl"
      contentWidthClass="max-w-4xl"
      highlight="tint"
      collapsedMode="bar"
    >
      {#snippet title()}
        <h3 class="text-xl font-semibold">Shell demo: account dashboard</h3>
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
        <div class="space-y-2">
          <h4 class="font-medium">RowFrame variants</h4>

          <RowFrame clickable={true}>
            {#snippet leading()}<div class="avatar placeholder"><div class="bg-neutral text-neutral-content rounded-full w-8"><span>U</span></div></div>{/snippet}
            {#snippet title()}Default row{/snippet}
            {#snippet subtitle()}Leading + title/subtitle/meta + trailing{/snippet}
            {#snippet meta()}Meta information{/snippet}
            {#snippet trailing()}<button class="btn btn-xs btn-outline">Action</button>{/snippet}
          </RowFrame>

          <RowFrame dense={true} selected={true}>
            {#snippet title()}Dense + selected row{/snippet}
            {#snippet subtitle()}Useful for compact list contexts{/snippet}
            {#snippet trailing()}<span class="badge badge-primary badge-sm">Selected</span>{/snippet}
          </RowFrame>

          <RowFrame noLeading={true} clickable={true}>
            <div class="w-full flex items-center justify-between gap-3">
              <div>
                <div class="font-medium">Custom content row (no leading column)</div>
                <div class="text-xs opacity-70">For rows that already include full internal layout.</div>
              </div>
              <button class="btn btn-xs btn-ghost">More</button>
            </div>
          </RowFrame>
        </div>

        <div class="text-sm opacity-70 pt-2">
          Scroll this page down to trigger the scaffold’s collapsed header mode and quick-actions tray.
        </div>

        <div class="space-y-2">
          {#each Array.from({ length: 6 }) as _, i}
            <div class="rounded-lg border border-base-300 bg-base-100 p-3 text-sm opacity-80">
              Filler content block {i + 1} — used to test sticky/collapsed shell behavior while scrolling.
            </div>
          {/each}
        </div>
      </FlowDecoration>
    </PageScaffold>
  </div>
</section>
