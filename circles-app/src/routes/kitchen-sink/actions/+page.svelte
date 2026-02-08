<script lang="ts">
  import { Plus as LPlus, RefreshCw as LRefreshCw, Star as LStar } from 'lucide';

  import ActionButton from '$lib/components/ActionButton.svelte';
  import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/types/actions';

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

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Actions</h2>

  <div class="space-y-2">
    <h3 class="font-medium">ActionButton states</h3>
    <div class="flex flex-wrap gap-3 items-center">
      <ActionButton action={fakeSuccess} title="Always succeeds">Save</ActionButton>
      <ActionButton action={fakeFlaky} title="Flaky demo">Flaky action</ActionButton>
      <ActionButton action={fakeSuccess} disabled={true}>Disabled</ActionButton>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">ActionButtonBar</h3>
    <div class="flex flex-wrap gap-2 items-center">
      <ActionButtonBar actions={actionItems} />
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">ActionButtonDropDown</h3>
    <div style="--collapsed-h:3rem; --collapsed-h-md:3.5rem;" class="max-w-xs">
      <ActionButtonDropDown actions={actionItems} />
    </div>
  </div>
</section>
