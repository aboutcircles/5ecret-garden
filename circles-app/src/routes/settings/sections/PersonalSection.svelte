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

{#if avatarAddress}
  <div class="bg-base-100 border border-base-300 rounded-xl p-3 mb-3">
    <div class="text-xs text-base-content/60 mb-1">Profile CID</div>
    <div class="text-xs text-base-content/70 flex flex-wrap items-center gap-2">
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
  </div>
  <ProfileExplorer avatar={avatarAddress} pinApiBase={pinApiBase} showNamespaces={false} showSigningKeys={false} />
{:else}
  <div class="p-4 text-sm opacity-70">Connect a Circles avatar first to edit your profile.</div>
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
