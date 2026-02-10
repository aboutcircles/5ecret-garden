<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import GroupSetting from '$lib/areas/settings/ui/editors/GroupSetting.svelte';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    group: string;
  }

  let { group }: Props = $props();

  const isActiveGroup = $derived.by(() => {
    const current = (avatarState.avatar?.address ?? '').toLowerCase();
    return !!avatarState.isGroup && !!current && current === group.toLowerCase();
  });

  async function openStats() {
    await goto(`/groups/metrics/${group}`);
    popupControls.close();
  }
</script>

<div class="space-y-4">
  <Avatar address={group} view="horizontal" clickable={false} />

  <div class="text-sm opacity-80">
    Prototype group settings surface. This popup is route-local and meant to converge toward the
    new owned-group management model.
  </div>

  {#if isActiveGroup}
    <div class="alert alert-info text-sm">
      <span>
        You are currently connected as this group, so we can reuse the existing advanced settings editor.
      </span>
    </div>

    <section class="bg-base-100 border border-base-300 rounded-xl p-3">
      <GroupSetting />
    </section>
  {:else}
    <div class="alert alert-warning text-sm">
      <span>
        Advanced on-chain settings are still coupled to active group identity. For this prototype, switch to
        this group in connect-wallet to use the old editor.
      </span>
    </div>
  {/if}

  <div class="flex justify-end gap-2">
    <button type="button" class="btn btn-ghost btn-sm" onclick={openStats}>Open stats</button>
    <button type="button" class="btn btn-sm" onclick={() => popupControls.close()}>Close</button>
  </div>
</div>
