<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
import { ProfileNamespaces } from '$lib/domains/profile/ui';
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

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">Namespaces</h3>
      <p class="text-xs text-base-content/70 mt-0.5">App/profile sources.</p>
    </div>
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if !avatarAddress}
    <div class="text-sm opacity-70">Connect a Circles avatar first to edit your namespaces.</div>
  {:else if nsError}
    <div class="alert alert-error text-xs">{nsError}</div>
  {:else if nsLoading}
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
