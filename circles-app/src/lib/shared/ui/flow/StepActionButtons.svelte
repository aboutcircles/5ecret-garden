<script lang="ts">
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';

  interface Props {
    className?: string;
    align?: 'end' | 'between';
    stackOnMobile?: boolean;
    primaryLabel: string;
    onPrimary?: () => void;
    primaryDisabled?: boolean;
    primaryType?: 'button' | 'submit';
    primaryClass?: string;
    secondaryLabel?: string;
    onSecondary?: () => void;
    secondaryDisabled?: boolean;
    secondaryType?: 'button' | 'submit';
    secondaryClass?: string;
  }

  let {
    className = '',
    align = 'end',
    stackOnMobile = true,
    primaryLabel,
    onPrimary,
    primaryDisabled = false,
    primaryType = 'button',
    primaryClass = 'btn btn-primary btn-sm',
    secondaryLabel,
    onSecondary,
    secondaryDisabled = false,
    secondaryType = 'button',
    secondaryClass = 'btn btn-ghost btn-sm',
  }: Props = $props();
</script>

<StepActionBar {className} {align} {stackOnMobile}>
  {#if secondaryLabel}
    {#snippet secondary()}
      <button
        type={secondaryType}
        class={secondaryClass}
        onclick={onSecondary}
        disabled={secondaryDisabled}
      >
        {secondaryLabel}
      </button>
    {/snippet}
  {/if}

  {#snippet primary()}
    <button
      type={primaryType}
      class={primaryClass}
      onclick={onPrimary}
      disabled={primaryDisabled}
    >
      {primaryLabel}
    </button>
  {/snippet}
</StepActionBar>
