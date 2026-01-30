<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProfileNamespaces from '$lib/profile/ProfileNamespaces.svelte';

  type Props = {
    avatarAddress: Address | '';
    pinApiBase: string;
    nsError: string | null;
    nsLoading: boolean;
    nsResolvedAvatar: Address | null;
    nsNamespaces: Record<string, string>;
    nsIsOwner: boolean;
    onNamespacesChanged: (e: CustomEvent<Record<string, string>>) => void;
    saveNamespacesProfile: () => Promise<void>;
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
    saveNamespacesProfile,
  }: Props = $props();
</script>

{#if !avatarAddress}
  <div class="p-4 text-sm opacity-70">Connect a Circles avatar first to edit your namespaces.</div>
{:else}
  {#if nsError}
    <div class="alert alert-error text-xs">{nsError}</div>
  {/if}

  <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm w-full">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-sm m-0">Namespaces</h3>
      <span class="text-[11px] opacity-60">App/profile sources</span>
    </div>

    {#if nsLoading}
      <div class="text-sm opacity-70">Loading…</div>
    {:else if nsResolvedAvatar}
      <ProfileNamespaces
        avatar={nsResolvedAvatar}
        {pinApiBase}
        namespaces={nsNamespaces}
        readonly={!nsIsOwner}
        on:namespacesChanged={(e) => onNamespacesChanged(new CustomEvent('namespacesChanged', { detail: e.detail }))}
      />
    {:else}
      <div class="text-sm opacity-70">No avatar resolved.</div>
    {/if}
  </section>

  {#if nsIsOwner}
    <div class="flex justify-end w-full">
      <button class="btn btn-primary btn-sm" onclick={saveNamespacesProfile}>Save</button>
    </div>
  {/if}
{/if}
