<script lang="ts">
  import { Plus as LPlus, RefreshCw as LRefreshCw, Star as LStar } from 'lucide';

  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { T } from '$lib/design-system/tokens';

  let flakyCount = $state(0);

  async function fakeSuccess(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  async function fakeFlaky(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    flakyCount += 1;
    if (flakyCount % 2 === 1) {
      throw new Error('Simulated failure (every first click in a pair).');
    }
  }

  const actionItems: Action[] = [
    { id: 'refresh', label: 'Refresh', iconNode: LRefreshCw, variant: 'ghost', onClick: () => {} },
    { id: 'create', label: 'Create', iconNode: LPlus, variant: 'primary', onClick: () => {} },
    { id: 'fav', label: 'Favorite', iconNode: LStar, variant: 'ghost', onClick: () => {} }
  ];
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Actions</h2>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">ActionButton states</h3>
    <div class="flex flex-wrap gap-3 items-center">
      <ActionButton action={fakeSuccess} title="Always succeeds">Save</ActionButton>
      <ActionButton action={fakeFlaky} title="Flaky demo">Flaky action</ActionButton>
      <ActionButton action={fakeSuccess} disabled={true}>Disabled</ActionButton>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">ActionButtonBar</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
      <ActionButtonBar actions={actionItems} />
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">ActionButtonDropDown</h3>
    <div style="--collapsed-h:3rem; --collapsed-h-md:3.5rem;max-width:320px;">
      <ActionButtonDropDown actions={actionItems} />
    </div>
  </div>
</section>
