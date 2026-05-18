<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
import { ProfileSigningKeys } from '$lib/shared/ui/profile';
import { AddSigningKey } from '$lib/shared/ui/profile';
  import { openStep } from '$lib/shared/flow';
  import { browser } from '$app/environment';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
  import { settings } from '$lib/shared/state/settings.svelte';

  type Props = {
    avatarAddress: Address | '';
    pinApiBase: string;
    deleteLocalKey: () => Promise<void>;
  };

  let { avatarAddress, pinApiBase, deleteLocalKey }: Props = $props();

  let hasLocalPrivateKey = $state(false);

  $effect(() => {
    if (!browser) {
      hasLocalPrivateKey = false;
      return;
    }
    const storage = CirclesStorage.getInstance();
    const key = storage.privateKey;
    hasLocalPrivateKey = !!(key && key.trim().length > 0);
  });

  function openAddSigningKey(): void {
    if (!avatarAddress) return;
    openStep({
      title: 'Add signing key',
      component: AddSigningKey,
      props: { avatar: avatarAddress, pinApiBase },
    });
  }
</script>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
  <div style="min-width:0;">
    <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Signing keys</h3>
    <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">Manage keys stored for this avatar.</p>
  </div>
  {#if avatarAddress}
    <button
      type="button"
      style="display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
      onclick={openAddSigningKey}
    ><Icon name="plus" size={11} stroke="#fff" strokeWidth={2.4} /> Add key</button>
  {/if}
</section>

{#if !avatarAddress}
  <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
    <div style="font-size:12.5px;color:{T.inkMuted};">Connect a Circles avatar first to manage keys.</div>
  </section>
{:else}
  <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
    <ProfileSigningKeys
      avatar={avatarAddress}
      {pinApiBase}
      readonly={false}
      showHeader={false}
      onAddSigningKey={openAddSigningKey}
    />
  </section>

  {#if settings.advancedMode && hasLocalPrivateKey}
    <section style="background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:14px;padding:14px 16px;width:100%;">
      <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Security</h3>
      <p style="font-size:11.5px;color:{T.inkBody};margin:2px 0 0 0;line-height:1.5;">
        A locally stored (imported v1) private key exists on this device.
      </p>
      <div style="margin-top:10px;">
        <button
          type="button"
          style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.warning};background:{T.surface};color:{T.warning};font-size:12px;font-weight:540;cursor:pointer;"
          onclick={deleteLocalKey}
          title="Remove the Circles.garden key from this device"
        >Delete key from this device</button>
      </div>
    </section>
  {/if}
{/if}
