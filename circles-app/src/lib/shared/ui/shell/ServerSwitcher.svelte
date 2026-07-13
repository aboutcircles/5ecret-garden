<script lang="ts">
  import { onMount } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';
  import { settings, updateSettings } from '$lib/shared/state/settings.svelte';

  type Server = 'production' | 'staging';

  // Which way the menu opens — 'up' for the desktop sidebar footer (anchored at the
  // bottom of the viewport), 'down' for the mobile header.
  let { direction = 'down' }: { direction?: 'up' | 'down' } = $props();

  // The server toggle only maps to a real alternate backend on Gnosis mainnet (staging
  // indexes the same chain); on other networks there's nothing to switch, so hide it.
  const isSwitchable = $derived(settings.network === 'gnosis');

  const options: { id: Server; label: string }[] = [
    { id: 'production', label: 'Production' },
    { id: 'staging', label: 'Staging' },
  ];
  const active = $derived(settings.server === 'staging' ? 'staging' : 'production');
  const isStaging = $derived(active === 'staging');

  let detailsEl: HTMLDetailsElement | null = $state(null);
  function close(): void {
    if (detailsEl?.open) detailsEl.open = false;
  }
  function choose(target: Server): void {
    close();
    if (target === active) return;
    // The SDK and its realtime websocket are built once at wallet init, so the switch
    // can't take effect live — persist the choice and reload to rebuild against the new
    // backend (same contract as the Environment popup's toggle).
    updateSettings({ server: target });
    if (typeof window !== 'undefined') window.location.reload();
  }

  function onDocClick(e: MouseEvent): void {
    const t = e.target as Node | null;
    if (detailsEl?.open && t && !detailsEl.contains(t)) close();
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close();
  }
  onMount(() => {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeydown);
    };
  });
</script>

{#if isSwitchable}
  <details bind:this={detailsEl} class="serverswitch">
    <summary
      class="serverswitch-chip"
      aria-haspopup="menu"
      title={isStaging
        ? 'Data source: Staging backend — click to switch'
        : 'Data source: Production backend — click to switch'}
      style="
        display:inline-flex;align-items:center;gap:5px;cursor:pointer;
        font-family:{T.fontSans};font-size:11.5px;font-weight:560;line-height:1;
        padding:4px 8px;border-radius:9999px;white-space:nowrap;
        background:{isStaging ? 'rgba(217,119,6,0.12)' : 'transparent'};
        color:{isStaging ? '#B45309' : T.inkBody};
        border:1px solid {isStaging ? 'rgba(217,119,6,0.30)' : T.hairline};
      "
    >
      <span
        style="width:6px;height:6px;border-radius:9999px;flex-shrink:0;background:{isStaging ? '#D97706' : T.inkFaint};"
        aria-hidden="true"
      ></span>
      {options.find((o) => o.id === active)?.label}
      <svg viewBox="0 0 12 12" aria-hidden="true" style="width:9px;height:9px;opacity:0.55;">
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </summary>

    <div
      role="menu"
      class="serverswitch-menu"
      style="
        position:absolute;{direction === 'up' ? 'bottom:calc(100% + 6px);' : 'top:calc(100% + 6px);'}left:0;z-index:30;
        min-width:196px;background:{T.surface};border:1px solid {T.hairline};border-radius:12px;
        box-shadow:0 8px 28px rgba(15,10,30,0.14);padding:6px;
      "
    >
      <div
        style="font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:{T.inkMuted};padding:5px 8px 4px;"
      >
        Data source
      </div>
      {#each options as opt}
        {@const on = opt.id === active}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={on}
          onclick={() => choose(opt.id)}
          class="serverswitch-item"
          style="
            display:flex;align-items:center;gap:8px;width:100%;text-align:left;cursor:pointer;
            background:{on ? T.surfaceAlt : 'transparent'};border:0;border-radius:8px;
            padding:7px 8px;font-family:{T.fontSans};font-size:12.5px;color:{T.inkBody};
          "
        >
          <span
            style="width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:{opt.id === 'staging' ? '#D97706' : T.inkFaint};"
            aria-hidden="true"
          ></span>
          <span style="flex:1;font-weight:{on ? 580 : 480};">{opt.label}</span>
          {#if on}
            <svg viewBox="0 0 16 16" aria-hidden="true" style="width:13px;height:13px;color:{T.primary};">
              <path d="M3.5 8.5 6.5 11.5 12.5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          {/if}
        </button>
      {/each}
      <div style="font-size:10.5px;color:{T.inkMuted};padding:5px 8px 3px;line-height:1.4;">
        Switching reloads the app.
      </div>
    </div>
  </details>
{/if}

<style>
  /* Self-contained dropdown; the menu is absolutely positioned against this anchor. */
  .serverswitch {
    position: relative;
  }
  /* Hide the native <details> disclosure triangle. */
  .serverswitch summary {
    list-style: none;
  }
  .serverswitch summary::-webkit-details-marker {
    display: none;
  }
  .serverswitch-item:hover {
    background: rgba(0, 0, 0, 0.04) !important;
  }
</style>
