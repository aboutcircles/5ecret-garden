<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
import ProfileExplorer from '$lib/areas/profile/ui/ProfileExplorer.svelte';
  import GroupSetting from '$lib/areas/settings/ui/editors/GroupSetting.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import { ipfsGatewayUrl } from '$lib/shared/utils/ipfs';
  import { canMigrate } from '$lib/shared/guards/canMigrate';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  type Props = {
    avatarAddress: Address | '';
    avatarState: any;
    pinApiBase: string;

    profileCid: string | null;
    profileCidLoading: boolean;
    profileCidError: string | null;
    copyProfileCid: () => Promise<void>;

    migrateToV2: () => Promise<void>;
    stopV1: () => Promise<void>;
  };

  let {
    avatarAddress,
    avatarState,
    pinApiBase,
    profileCid,
    profileCidLoading,
    profileCidError,
    copyProfileCid,
    migrateToV2,
    stopV1,
  }: Props = $props();
</script>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0 0 6px 0;">Profile CID</h3>
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
    {#if profileCidLoading}
      <span style="font-size:12px;color:{T.inkMuted};">Loading…</span>
    {:else if profileCid}
      <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkBody};word-break:break-all;flex:1;min-width:200px;">{profileCid}</span>
      <button
        type="button"
        style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
        onclick={copyProfileCid}
      ><Icon name="copy" size={9} stroke={T.inkMuted} /> Copy</button>
      <a
        href={ipfsGatewayUrl(profileCid)}
        target="_blank"
        rel="noopener noreferrer"
        style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;background:{T.primaryFaint};color:{T.primary};font-size:11px;font-weight:540;text-decoration:none;"
      ><Icon name="external" size={9} stroke={T.primary} /> Open</a>
    {:else}
      <span style="font-size:12px;color:{T.inkMuted};">No profile yet</span>
    {/if}
    {#if profileCidError}
      <span style="font-size:11.5px;color:{T.negative};">{profileCidError}</span>
    {/if}
  </div>
</section>

{#if avatarAddress}
  <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
    <ProfileExplorer avatar={avatarAddress} pinApiBase={pinApiBase} />
  </section>
{:else}
  <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
    <div style="font-size:12.5px;color:{T.inkMuted};">Connect a Circles avatar first to edit your profile.</div>
  </section>
{/if}

{#if avatarState?.isGroup}
  <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
    <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Advanced group settings</h3>
    <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">Group-specific configuration.</p>
    <div style="margin-top:10px;">
      <GroupSetting />
    </div>
  </section>
{/if}

{#if avatarState?.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
  {#if avatarState?.avatar?.avatarInfo?.version === 1}
    <section style="
      background:linear-gradient(135deg,{T.primaryFaint} 0%,{T.lilacSoft} 100%);
      border:1px solid rgba(88,73,212,0.18);border-radius:14px;padding:14px 16px;width:100%;
    ">
      <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Circles V2</h3>
      <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">Upgrade your profile to V2.</p>
      <div style="margin-top:10px;">
        <ActionButton action={migrateToV2} class="btn btn-primary">Update to Circles V2</ActionButton>
      </div>
    </section>
  {/if}
  {#if avatarState?.avatar?.avatarInfo?.v1Token && !avatarState?.avatar?.avatarInfo?.v1Stopped}
    <section style="
      background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);
      border-radius:14px;padding:14px 16px;width:100%;
    ">
      <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Circles V1</h3>
      <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">Stop your V1 account permanently. This cannot be undone.</p>
      <div style="margin-top:10px;">
        <ActionButton action={stopV1} class="btn btn-outline">
          <span style="color:{T.warning};font-weight:540;">Stop V1 account permanently</span>
        </ActionButton>
      </div>
    </section>
  {/if}
{/if}
