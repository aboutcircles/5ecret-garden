<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
import { ProfileNamespaces } from '$lib/shared/ui/profile';
  import { T } from '$lib/design-system/tokens.js';
  type Props = {
    avatarAddress: Address | '';
    pinApiBase: string;
    nsError: string | null;
    nsLoading: boolean;
    nsResolvedAvatar: Address | null;
    nsNamespaces: Record<string, string>;
    nsIsOwner: boolean;
    onNamespacesChanged: (e: CustomEvent<Record<string, string>>) => void;
  };

  let {
    avatarAddress,
    pinApiBase,
    nsError,
    nsLoading,
    nsResolvedAvatar,
    nsNamespaces,
    nsIsOwner,
    onNamespacesChanged,
  }: Props = $props();
</script>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">App data</h3>
  <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">App and profile data sources.</p>
</section>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  {#if !avatarAddress}
    <div style="font-size:12.5px;color:{T.inkMuted};">Connect a Circles avatar first to edit your namespaces.</div>
  {:else if nsError}
    <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:{T.inkBody};">{nsError}</div>
  {:else if nsLoading}
    <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:{T.inkMuted};">
      <svg class="ns-spin" style="width:12px;height:12px;color:{T.primary};" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
      Loading…
    </div>
  {:else if nsResolvedAvatar}
    <ProfileNamespaces
      avatar={nsResolvedAvatar}
      {pinApiBase}
      namespaces={nsNamespaces}
      readonly={!nsIsOwner}
      on:namespacesChanged={(e) => onNamespacesChanged(new CustomEvent('namespacesChanged', { detail: e.detail }))}
    />
  {:else}
    <div style="font-size:12.5px;color:{T.inkMuted};">No avatar resolved.</div>
  {/if}
</section>

<style>
  @keyframes ns-spin { from {} to { transform: rotate(360deg); } }
  .ns-spin { animation: ns-spin 0.8s linear infinite; }
</style>
