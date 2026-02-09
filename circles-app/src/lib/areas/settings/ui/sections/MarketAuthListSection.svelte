<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';

  type ListStore = Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;

  type Props = {
    title: string;
    description: string;
    avatarAddress: Address | '';
    authed: boolean;
    ensureAuthed: () => Promise<void>;
    store: ListStore;
    row: any;
    connectMessage: string;
    signInMessage: string;
    signInLabel?: string;
  };

  let {
    title,
    description,
    avatarAddress,
    authed,
    ensureAuthed,
    store,
    row,
    connectMessage,
    signInMessage,
    signInLabel = 'Sign in'
  }: Props = $props();
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">{title}</h3>
      <p class="text-xs text-base-content/70 mt-0.5">{description}</p>
    </div>
    {#if avatarAddress && !authed}
      <button class="btn btn-primary btn-sm" onclick={() => ensureAuthed()}>
        {signInLabel}
      </button>
    {/if}
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if !avatarAddress}
    <div class="text-sm opacity-70">{connectMessage}</div>
  {:else if !authed}
    <div class="text-sm opacity-70">{signInMessage}</div>
  {:else}
    <GenericList store={store} {row} getKey={(it) => it.key} />
  {/if}
</section>
