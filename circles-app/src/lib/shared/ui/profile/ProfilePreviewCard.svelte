<script lang="ts">
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import type { AppProfileCore } from '$lib/shared/model/profile';
  import { T } from '$lib/design-system/tokens.js';

  type Props = {
    profile: AppProfileCore | null | undefined;
    title?: string;
  };

  let { profile, title = 'Profile' }: Props = $props();
</script>

<div style="display:flex;align-items:flex-start;gap:16px;">
  <div style="width:96px;height:96px;border-radius:10px;background:{T.pageDeep};overflow:hidden;display:flex;align-items:center;justify-content:center;color:{T.inkSubtle};flex-shrink:0;">
    {#if profile?.previewImageUrl}
      <img
        src={profile.previewImageUrl}
        alt={title}
        style="width:100%;height:100%;object-fit:cover;"
      />
    {:else if profile?.imageUrl}
      <img
        src={profile.imageUrl}
        alt={title}
        style="width:100%;height:100%;object-fit:cover;"
      />
    {:else}
      No image
    {/if}
  </div>

  <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
    <div>
      <div style="font-size:12px;color:{T.inkMuted};">Name</div>
      <div style="font-size:14px;font-weight:600;">{profile?.name || '—'}</div>
    </div>
    {#if profile?.description}
      <div>
        <div style="font-size:12px;color:{T.inkMuted};margin-bottom:2px;">Description</div>
        <Markdown content={profile.description} style="font-size:13px;line-height:1.6;color:{T.inkBody};max-width:none;" />
      </div>
    {:else}
      <div>
        <div style="font-size:12px;color:{T.inkMuted};margin-bottom:2px;">Description</div>
        <div style="font-size:14px;color:{T.inkSubtle};">No description provided.</div>
      </div>
    {/if}
  </div>

</div>
