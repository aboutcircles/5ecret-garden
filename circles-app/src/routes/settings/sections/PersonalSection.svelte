<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProfileExplorer from '$lib/domains/profile/ui/ProfileExplorer.svelte';
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

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div>
    <h3 class="text-sm font-semibold m-0">Profile</h3>
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
</section>

{#if avatarAddress}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <ProfileExplorer avatar={avatarAddress} pinApiBase={pinApiBase} showNamespaces={false} showSigningKeys={false} />
  </section>
{:else}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <div class="text-sm opacity-70">Connect a Circles avatar first to edit your profile.</div>
  </section>
{/if}

{#if avatarState?.isGroup}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <div>
      <h3 class="text-sm font-semibold m-0">Advanced group settings</h3>
      <p class="text-xs text-base-content/70 mt-0.5">Group-specific configuration.</p>
    </div>
    <div class="mt-3">
      <GroupSetting />
    </div>
  </section>
{/if}

{#if avatarState?.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
  {#if avatarState?.avatar?.avatarInfo?.version === 1}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <div>
        <h3 class="text-sm font-semibold m-0">Circles V2</h3>
        <p class="text-xs text-base-content/70 mt-0.5">Upgrade your profile to V2.</p>
      </div>
      <div class="mt-3">
        <ActionButton action={migrateToV2}>Update to Circles V2</ActionButton>
      </div>
    </section>
  {/if}
  {#if avatarState?.avatar?.avatarInfo?.v1Token && !avatarState?.avatar?.avatarInfo?.v1Stopped}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <div>
        <h3 class="text-sm font-semibold m-0">Circles V1</h3>
        <p class="text-xs text-base-content/70 mt-0.5">Stop your V1 account permanently.</p>
      </div>
      <div class="mt-3">
        <ActionButton action={stopV1}>
          <span class="text-orange-400">Stop V1 account permanently</span>
        </ActionButton>
      </div>
    </section>
  {/if}
{/if}
