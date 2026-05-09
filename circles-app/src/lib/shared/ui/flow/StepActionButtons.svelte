<script lang="ts">
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    className?: string;
    align?: 'end' | 'between';
    stackOnMobile?: boolean;
    primaryLabel: string;
    onPrimary?: () => void;
    primaryDisabled?: boolean;
    primaryType?: 'button' | 'submit';
    secondaryLabel?: string;
    onSecondary?: () => void;
    secondaryDisabled?: boolean;
    secondaryType?: 'button' | 'submit';
  }

  let {
    className = '',
    align = 'end',
    stackOnMobile = true,
    primaryLabel,
    onPrimary,
    primaryDisabled = false,
    primaryType = 'button',
    secondaryLabel,
    onSecondary,
    secondaryDisabled = false,
    secondaryType = 'button',
  }: Props = $props();
</script>

<StepActionBar {className} {align} {stackOnMobile}>
  {#if secondaryLabel}
    {#snippet secondary()}
      <button
        type={secondaryType}
        style="height:40px;padding:0 18px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkMuted};font-size:13px;cursor:{secondaryDisabled ? 'not-allowed' : 'pointer'};"
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
      style="height:40px;padding:0 22px;border-radius:9999px;border:0;background:{primaryDisabled ? T.pageDeep : T.primary};color:{primaryDisabled ? T.inkMuted : '#fff'};font-size:13px;font-weight:580;cursor:{primaryDisabled ? 'not-allowed' : 'pointer'};box-shadow:{primaryDisabled ? 'none' : '0 4px 12px rgba(88,73,212,0.25)'};"
      data-popup-default-action
      onclick={onPrimary}
      disabled={primaryDisabled}
    >
      {primaryLabel}
    </button>
  {/snippet}
</StepActionBar>
