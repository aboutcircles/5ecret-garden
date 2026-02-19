<script lang="ts">
  import type { Snippet } from 'svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';

  interface Props {
    address: `0x${string}`;
    intro: string;
    warning: string;
    cta: string;
    action: () => void | Promise<void>;
    explainerTitle?: string;
    explainerPoints?: string[];
    quickHelpTitle?: string;
    quickHelpLines?: string[];
    showExplainerDetails?: boolean;
    insight?: Snippet;
  }

  let {
    address,
    intro,
    warning,
    cta,
    action,
    explainerTitle = 'More details (optional)',
    explainerPoints = [
      'Trust is on/off: you either accept this account’s Circles or you don’t.',
      'Trust is one-way: they need to trust you separately.',
      'Trust enables routing. When payments route through the network, the mix of Circles you hold can change (your total stays the same).',
      'If you end up holding Circles that are hard to spend, you can untrust to stop accepting more through this connection.',
    ],
    quickHelpTitle,
    quickHelpLines = [],
    showExplainerDetails = true,
    insight,
  }: Props = $props();

  const hasQuickHelp = $derived(Boolean(quickHelpTitle && quickHelpLines.length > 0));

  async function runAction(): Promise<void> {
    await action();
  }
</script>

<div class="flex flex-col gap-y-4 mt-8">
  <p>{intro}</p>

  <RowFrame clickable={false} dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar {address} clickable={false} view="horizontal" bottomInfo={address} />
    </div>
  </RowFrame>

  <div class="rounded-xl border border-warning/30 bg-warning/10 p-3">
    <div class="text-xs font-semibold text-base-content/60 mb-1">What this means</div>
    <p class="text-sm text-base-content/85">{warning}</p>

    {#if hasQuickHelp}
      <details class="mt-2 rounded-lg border border-warning/20 bg-base-100/70 p-2">
        <summary class="cursor-pointer text-xs font-semibold text-base-content/75">{quickHelpTitle}</summary>
        <ul class="mt-2 space-y-1 text-xs text-base-content/80">
          {#each quickHelpLines as line}
            <li>{line}</li>
          {/each}
        </ul>
      </details>
    {/if}
  </div>

  {#if insight}{@render insight()}{/if}

  <div class="flex justify-end">
    <ActionButton action={runAction}>{cta}</ActionButton>
  </div>

  {#if showExplainerDetails}
    <details class="bg-base-100 border border-base-300 rounded-xl p-3">
      <summary class="cursor-pointer text-sm font-semibold">{explainerTitle}</summary>
      <ul class="list-disc list-inside mt-2 text-sm text-base-content/80 space-y-1">
        {#each explainerPoints as point}
          <li>{point}</li>
        {/each}
      </ul>
    </details>
  {/if}
</div>
