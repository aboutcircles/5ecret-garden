<script lang="ts">
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
  }

  let {
    address,
    intro,
    warning,
    cta,
    action,
    explainerTitle = 'How trust works',
    explainerPoints = [
      'Trust in Circles is binary (on/off), not partial.',
      'Trust is not automatically reciprocal: if you trust someone, they still need to trust you back separately.',
      'Trust mainly changes which Circles you accept and can improve transfer paths through the network.',
    ],
  }: Props = $props();

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

  <div role="alert" class="alert alert-warning">
    <span>{warning}</span>
  </div>

  <details class="bg-base-100 border border-base-300 rounded-xl p-3">
    <summary class="cursor-pointer text-sm font-semibold">{explainerTitle}</summary>
    <ul class="list-disc list-inside mt-2 text-sm text-base-content/80 space-y-1">
      {#each explainerPoints as point}
        <li>{point}</li>
      {/each}
    </ul>
  </details>

  <slot name="insight"></slot>

  <div>
    <ActionButton action={runAction}>{cta}</ActionButton>
  </div>
</div>
