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
  import { T } from '$lib/design-system/tokens.js';

  const shellActionItems: Action[] = [
    { id: 'refresh', label: 'Refresh', iconNode: LRefreshCw, variant: 'ghost', onClick: () => {} },
    { id: 'create', label: 'Create', iconNode: LPlus, variant: 'primary', onClick: () => {} }
  ];
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Golden Components & Layouts</h2>
  <p style="font-size:13px;color:{T.inkMuted};margin:0;">
    Curated primitives aligned with the send-flow pattern and clean base pages. These are the canonical references for
    new and refactored flows.
  </p>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Flow orientation + validation feedback + CTA bar</h3>
    <div style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.pageDeep};padding:12px;display:flex;flex-direction:column;gap:12px;">
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
          <button style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:13px;font-weight:580;cursor:pointer;">Back</button>
        {/snippet}
        {#snippet primary()}
          <button style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:13px;font-weight:580;cursor:pointer;box-shadow:0 4px 12px rgba(88,73,212,0.25);">Continue</button>
        {/snippet}
      </StepActionBar>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">RowFrame (canonical row layout)</h3>
    <div style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.pageDeep};padding:12px;display:flex;flex-direction:column;gap:8px;">
      <RowFrame clickable={true}>
        {#snippet leading()}
          <div style="width:32px;height:32px;border-radius:9999px;background:{T.pageDeep};color:{T.inkMuted};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:580;">U</div>
        {/snippet}
        {#snippet title()}Default row{/snippet}
        {#snippet subtitle()}Leading + content + trailing action{/snippet}
        {#snippet meta()}Meta{/snippet}
        {#snippet trailing()}
          <button style="height:26px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:11.5px;font-weight:540;cursor:pointer;">Action</button>
        {/snippet}
      </RowFrame>

      <RowFrame dense={true} selected={true}>
        {#snippet title()}Dense selected row{/snippet}
        {#snippet subtitle()}Used in compact/selectable lists{/snippet}
        {#snippet trailing()}
          <span style="display:inline-block;background:rgba(88,73,212,0.12);color:{T.primaryDeep};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:580;">Selected</span>
        {/snippet}
      </RowFrame>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Clean base page shell (PageScaffold)</h3>
    <div style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.pageDeep};padding:12px 0;">
      <PageScaffold maxWidthClass="max-w-4xl" contentWidthClass="max-w-4xl" highlight="tint" collapsedMode="bar">
        {#snippet title()}
          <h3 style="font-size:18px;font-weight:580;margin:0;">Clean base page</h3>
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
          <p style="font-size:13px;color:{T.inkMuted};margin:0;">Use this as the default page-level composition baseline.</p>
        </FlowDecoration>
      </PageScaffold>
    </div>
  </div>
</section>
