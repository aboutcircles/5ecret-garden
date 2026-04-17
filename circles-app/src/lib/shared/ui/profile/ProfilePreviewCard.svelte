<script lang="ts">
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import type { AppProfileCore } from '$lib/shared/model/profile';

  type Props = {
    profile: AppProfileCore | null | undefined;
    title?: string;
  };

  let { profile, title = 'Profile' }: Props = $props();
</script>

<div class="flex items-start gap-4">
  <div class="w-24 h-24 rounded-lg bg-base-200 overflow-hidden flex items-center justify-center text-base-content/50">
    {#if profile?.previewImageUrl}
      <img
        src={profile.previewImageUrl}
        alt={title}
        class="w-full h-full object-cover"
      />
    {:else if profile?.imageUrl}
      <img
        src={profile.imageUrl}
        alt={title}
        class="w-full h-full object-cover"
      />
    {:else}
      No image
    {/if}
  </div>

  <div class="flex-1 space-y-2">
    <div>
      <div class="text-xs text-base-content/60">Name</div>
      <div class="text-sm font-semibold">{profile?.name || '—'}</div>
    </div>
    {#if profile?.description}
      <div>
        <div class="text-xs text-base-content/60 mb-0.5">Description</div>
        <Markdown content={profile.description} class="prose prose-sm max-w-none" />
      </div>
    {:else}
      <div>
        <div class="text-xs text-base-content/60 mb-0.5">Description</div>
        <div class="text-sm text-base-content/50">No description provided.</div>
      </div>
    {/if}
  </div>

</div>
