<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProfileExplorer from '$lib/profile/ProfileExplorer.svelte';
  import GroupSetting from '../editors/GroupSetting.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { ipfsGatewayUrl } from '$lib/utils/ipfs';
  import { canMigrate } from '$lib/guards/canMigrate';

  type Props = {
    avatarAddress: Address | '';
    avatarState: any;
    pinApiBase: string;

    profileCid: string | null;
    profileCidLoading: boolean;
    profileCidError: string | null;
    copyProfileCid: () => Promise<void>;

    extraAvatarsText: string;
    extraOperatorsText: string;
    marketSaved: string | null;
    saveMarketSettingsSection: () => void;

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
    extraAvatarsText = $bindable(''),
    extraOperatorsText = $bindable(''),
    marketSaved,
    saveMarketSettingsSection,
    migrateToV2,
    stopV1,
  }: Props = $props();
</script>

{#if avatarAddress}
  <div class="w-full -mt-1 text-xs text-base-content/70 flex flex-wrap items-center gap-2">
    <span class="font-semibold">Profile CID:</span>
    {#if profileCidLoading}
      <span>loading…</span>
    {:else if profileCid}
      <span class="font-mono select-all break-all">{profileCid}</span>
      <button class="btn btn-ghost btn-xs" onclick={copyProfileCid}>Copy</button>
      <a class="link link-primary text-xs" href={ipfsGatewayUrl(profileCid)} target="_blank" rel="noopener noreferrer">
        Open
      </a>
    {:else}
      <span class="opacity-70">none yet</span>
    {/if}
    {#if profileCidError}
      <span class="text-error">{profileCidError}</span>
    {/if}
  </div>
  <ProfileExplorer avatar={avatarAddress} pinApiBase={pinApiBase} showNamespaces={false} showSigningKeys={false} />
{:else}
  <div class="p-4 text-sm opacity-70">Connect a Circles avatar first to edit your profile.</div>
{/if}

{#if avatarAddress}
  <div class="w-full pt-2">
    <h2 class="font-bold">Market settings</h2>
    <div class="mt-1 text-xs text-base-content/70">These settings are saved per avatar on this device.</div>
    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Extra avatars to scan</label>
        <textarea
          class="textarea textarea-bordered font-mono text-xs min-h-[120px]"
          placeholder="0xabc..., one per line or comma-separated"
          bind:value={extraAvatarsText}
        ></textarea>
        <div class="text-xs opacity-70">Defaults are always included; add more here.</div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Extra operators</label>
        <textarea
          class="textarea textarea-bordered font-mono text-xs min-h-[120px]"
          placeholder="0xoperator..., one per line or comma-separated"
          bind:value={extraOperatorsText}
        ></textarea>
        <div class="text-xs opacity-70">Optional. Currently not used everywhere.</div>
      </div>
    </div>
    <div class="mt-3 flex items-center gap-2">
      <button class="btn btn-primary btn-sm" onclick={saveMarketSettingsSection}>Save</button>
      {#if marketSaved}
        <span class="text-xs text-success">{marketSaved}</span>
      {/if}
    </div>
  </div>
{/if}

{#if avatarState?.isGroup}
  <div class="w-full pt-2">
    <h2 class="font-bold">Advanced Group Settings</h2>
    <GroupSetting />
  </div>
{/if}

{#if avatarState?.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
  {#if avatarState?.avatar?.avatarInfo?.version === 1}
    <div class="w-full pt-2">
      <h2 class="text-lg font-medium">Circles V2</h2>
      <div class="mt-3">
        <ActionButton action={migrateToV2}>Update to Circles V2</ActionButton>
      </div>
    </div>
  {/if}
  {#if avatarState?.avatar?.avatarInfo?.v1Token && !avatarState?.avatar?.avatarInfo?.v1Stopped}
    <div class="w-full pt-2">
      <h2 class="text-lg font-medium">Circles V1</h2>
      <div class="mt-3">
        <ActionButton action={stopV1}>
          <span class="text-orange-400">Stop V1 account permanently</span>
        </ActionButton>
      </div>
    </div>
  {/if}
{/if}
