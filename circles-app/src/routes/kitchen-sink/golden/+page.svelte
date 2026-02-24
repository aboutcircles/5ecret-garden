<script lang="ts">
  import { Plus as LPlus, RefreshCw as LRefreshCw } from 'lucide';

  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';

  const shellActionItems: Action[] = [
    { id: 'refresh', label: 'Refresh', iconNode: LRefreshCw, variant: 'ghost', onClick: () => {} },
    { id: 'create', label: 'Create', iconNode: LPlus, variant: 'primary', onClick: () => {} }
  ];
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Golden Components & Layouts</h2>
  <p class="text-sm opacity-75">
    Curated primitives aligned with the send-flow pattern and clean base pages. These are the canonical references for
    new and refactored flows.
  </p>

  <div class="space-y-2">
    <h3 class="font-medium">Flow orientation + validation feedback + CTA bar</h3>
    <div class="rounded-xl border border-base-300 bg-base-200/20 p-3 space-y-3">
      <FlowStepHeader
        step={2}
        total={3}
        title="Amount"
        subtitle="Choose how much to send."
        labels={['Recipient', 'Amount', 'Review']}
      />
      <FlowDecoration size="sm">
        <StepAlert
          variant="warning"
          title="Amount exceeds available route capacity"
          message="Lower the amount or choose another route before continuing."
        />
      </FlowDecoration>
      <StepActionBar>
        {#snippet secondary()}
          <button class="btn btn-ghost">Back</button>
        {/snippet}
        {#snippet primary()}
          <button class="btn btn-primary">Continue</button>
        {/snippet}
      </StepActionBar>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">RowFrame (canonical row layout)</h3>
    <div class="rounded-xl border border-base-300 bg-base-200/20 p-3 space-y-2">
      <RowFrame clickable={true}>
        {#snippet leading()}<div class="avatar placeholder"><div class="bg-neutral text-neutral-content rounded-full w-8"><span>U</span></div></div>{/snippet}
        {#snippet title()}Default row{/snippet}
        {#snippet subtitle()}Leading + content + trailing action{/snippet}
        {#snippet meta()}Meta{/snippet}
        {#snippet trailing()}<button class="btn btn-xs btn-outline">Action</button>{/snippet}
      </RowFrame>

      <RowFrame dense={true} selected={true}>
        {#snippet title()}Dense selected row{/snippet}
        {#snippet subtitle()}Used in compact/selectable lists{/snippet}
        {#snippet trailing()}<span class="badge badge-primary badge-sm">Selected</span>{/snippet}
      </RowFrame>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Clean base page shell (PageScaffold)</h3>
    <div class="rounded-xl border border-base-300 bg-base-200/20 py-3">
      <PageScaffold maxWidthClass="max-w-4xl" contentWidthClass="max-w-4xl" highlight="tint" collapsedMode="bar">
        {#snippet title()}
          <h3 class="text-xl font-semibold">Clean base page</h3>
        {/snippet}

        {#snippet meta()}
          Title/meta/actions in one reusable scaffold with collapsed controls.
        {/snippet}

        {#snippet headerActions()}
          <ActionButtonBar actions={shellActionItems} />
        {/snippet}

        {#snippet collapsedMenu()}
          <ActionButtonDropDown actions={shellActionItems} />
        {/snippet}

        <FlowDecoration size="sm">
          <p class="text-sm opacity-80">Use this as the default page-level composition baseline.</p>
        </FlowDecoration>
      </PageScaffold>
    </div>
  </div>
</section>
