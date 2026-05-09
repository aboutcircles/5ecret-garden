<script lang="ts">
  import { popupControls } from '$lib/shared/state/popup';
  import { sanitizeUrl } from '$lib/shared/ui/content/markdown/ast';
  import { T } from '$lib/design-system/tokens.js';

  let copyIcon = $state('/copy.svg');

  interface Props {
    to?: string;
  }

  const { to = '' }: Props = $props();

  const destination = $derived(sanitizeUrl(to) ?? null);

  function copyDestination(): void {
    if (!destination) return;
    navigator.clipboard?.writeText(destination).catch(() => {});
    copyIcon = '/check.svg';
    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }

  function onBack() {
    popupControls.back();
  }

  function onContinue() {
    if (!destination) return;
    window.open(destination, '_blank', 'noopener,noreferrer');
    popupControls.back();
  }
</script>

<div style="width:100%;">
  {#if destination}
    <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
      <div style="font-size:13px;opacity:0.7;color:{T.inkMuted};">You are about to open this link in a new tab:</div>
      <div style="position:relative;font-family:{T.fontMono};font-size:13px;background:{T.pageDeep};border:1px solid {T.hairlineSoft};border-radius:8px;padding:12px 40px 12px 12px;">
        <div style="white-space:nowrap;overflow-x:auto;">
          {destination}
        </div>

        <button
          type="button"
          style="position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:7px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
          title="Copy address"
          aria-label="Copy address"
          onclick={copyDestination}
        >
          <img src={copyIcon} alt="" style="width:16px;height:16px;" />
        </button>
      </div>

      <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;">
        <button type="button" style="height:32px;padding:0 16px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);" onclick={onContinue}>Continue</button>
        <button type="button" style="height:32px;padding:0 16px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;" onclick={onBack}>Cancel</button>
      </div>
    </div>
  {:else}
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="padding:12px 14px;border-radius:12px;background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);font-size:13px;color:{T.negative};">
        Invalid or unsupported link.
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button type="button" style="height:32px;padding:0 16px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;" onclick={onBack}>Back</button>
      </div>
    </div>
  {/if}
</div>
