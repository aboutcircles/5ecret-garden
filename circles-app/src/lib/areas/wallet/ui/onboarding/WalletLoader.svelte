<script lang="ts">
  import { clearSession } from '$lib/shared/state/wallet.svelte';
  import { T } from '$lib/design-system/tokens.js';
</script>

<div style="width:100%;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:32px;gap:12px;box-shadow:{T.shadow.xs};">
  <svg class="wl-spin" style="width:32px;height:32px;color:{T.primary};" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
  </svg>
  <p style="font-family:{T.fontSans};font-size:14px;font-weight:580;color:{T.ink};margin-top:8px;">Connecting your account…</p>
  <p style="font-size:13px;color:{T.inkMuted};">Please wait</p>
  <button onclick={clearSession} style="height:32px;padding:0 16px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;margin-top:8px;">Cancel</button>
</div>

<style>
  @keyframes wl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .wl-spin { animation: wl-spin 0.9s linear infinite; }
</style>
