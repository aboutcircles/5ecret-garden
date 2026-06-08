<script lang="ts">
  import { page } from '$app/stores';
  import { sanitizeUrl } from '$lib/shared/ui/content/markdown/ast';
  import { T } from '$lib/design-system/tokens.js';

  let copyIcon = $state('/copy.svg');

  const rawTo = $derived($page.url.searchParams.get('to') ?? '');
  const destination = $derived(sanitizeUrl(rawTo));

  function copyDestination(): void {
    if (!destination) return;
    navigator.clipboard?.writeText(destination).catch(() => {});
    copyIcon = '/check.svg';
    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }
</script>

<div style="width:100%;display:flex;justify-content:center;padding:0 16px;">
  <div style="width:100%;max-width:448px;margin-top:40px;display:flex;flex-direction:column;gap:16px;">
    <h1 style="font-family:{T.fontDisplay};font-size:20px;color:{T.ink};letter-spacing:-0.015em;margin:0;">Leaving this app</h1>

    {#if destination}
      <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:13px;color:{T.inkMuted};">You are about to open this link in a new tab:</div>
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

        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <a
            style="display:inline-flex;align-items:center;height:44px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;text-decoration:none;font-family:{T.fontSans};font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
            href={destination}
            target="_blank"
            rel="noopener noreferrer"
          >Continue</a>
          <button
            type="button"
            style="height:44px;padding:0 18px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;"
            onclick={() => history.back()}
          >Back</button>
        </div>
      </div>
    {:else}
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="padding:12px 14px;border-radius:12px;background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);font-size:13px;color:{T.negative};">
          Invalid or unsupported link.
        </div>
        <button
          type="button"
          style="align-self:flex-start;height:44px;padding:0 18px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;"
          onclick={() => history.back()}
        >Back</button>
      </div>
    {/if}
  </div>
</div>
