<script lang="ts">
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

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
  }: Props = $props();

  const hasQuickHelp = $derived(Boolean(quickHelpTitle && quickHelpLines.length > 0));

  async function runAction(): Promise<void> {
    await action();
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <p style="margin:0;font-size:13.5px;color:{T.inkBody};line-height:1.5;">{intro}</p>

  <!-- Recipient card -->
  <div style="
    background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:14px 16px;box-shadow:{T.shadow.xs};
  ">
    <Avatar {address} clickable={false} view="horizontal" bottomInfo={address} />
  </div>

  <!-- Warning card -->
  <div style="
    background:{T.warningSoft};border:1px solid rgba(176,112,20,0.20);border-radius:14px;
    padding:14px 16px;display:flex;flex-direction:column;gap:10px;
  ">
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="
        width:24px;height:24px;border-radius:8px;flex-shrink:0;
        background:rgba(255,255,255,0.55);
        display:inline-flex;align-items:center;justify-content:center;
      ">
        <Icon name="info" size={12} stroke={T.warning} strokeWidth={2} />
      </div>
      <span style="font-size:11px;font-weight:600;color:{T.warning};letter-spacing:0.04em;text-transform:uppercase;">What this means</span>
    </div>
    <p style="margin:0;font-size:13px;color:{T.inkBody};line-height:1.5;">{warning}</p>

    {#if hasQuickHelp}
      <details style="
        background:rgba(255,255,255,0.55);border:1px solid rgba(176,112,20,0.18);border-radius:10px;
        padding:10px 12px;
      ">
        <summary style="cursor:pointer;font-size:12px;font-weight:580;color:{T.inkBody};list-style:none;">
          {quickHelpTitle}
        </summary>
        <ul style="margin:8px 0 0;padding-left:16px;display:flex;flex-direction:column;gap:4px;">
          {#each quickHelpLines as line}
            <li style="font-size:12px;color:{T.inkBody};line-height:1.45;">{line}</li>
          {/each}
        </ul>
      </details>
    {/if}
  </div>

  <slot name="insight"></slot>

  <!-- Action -->
  <div style="display:flex;justify-content:flex-end;">
    <ActionButton
      action={runAction}
      class="btn w-full sm:w-auto sm:min-w-[140px]"
    >{cta}</ActionButton>
  </div>

  {#if showExplainerDetails}
    <details style="
      background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
      padding:14px 16px;
    ">
      <summary style="cursor:pointer;font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;list-style:none;">
        {explainerTitle}
      </summary>
      <ul style="margin:10px 0 0;padding-left:16px;display:flex;flex-direction:column;gap:5px;">
        {#each explainerPoints as point}
          <li style="font-size:12.5px;color:{T.inkBody};line-height:1.5;">{point}</li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  details summary::-webkit-details-marker { display: none; }
</style>
