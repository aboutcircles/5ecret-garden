<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import {
    bookmarksStateStore,
    profileBookmarksService,
    type ProfileBookmark,
  } from '$lib/areas/settings/state/profileBookmarks';
  import { openConfirmPopup } from '$lib/shared/ui/shell/confirmDialogs';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    bookmark: ProfileBookmark;
  }

  let { bookmark }: Props = $props();
  let folders: string[] = $state([]);
  // svelte-ignore state_referenced_locally
  let selectedFolder: string = $state(bookmark.folder ?? '__none__');

  function formatCreatedAt(ts: number): string {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '';
    }
  }

  $effect(() => {
    const unsubscribe = bookmarksStateStore.subscribe((state) => {
      folders = state.folders;
    });
    return () => unsubscribe();
  });

  function moveToSelectedFolder(): void {
    profileBookmarksService.upsertProfile(bookmark.address, {
      folder: selectedFolder === '__none__' ? null : selectedFolder,
    });
  }

  async function clearNote(): Promise<void> {
    const ok = await openConfirmPopup({
      title: 'Clear note',
      message: 'Clear the saved note for this bookmark?',
    });
    if (!ok) return;
    profileBookmarksService.upsertProfile(bookmark.address, { note: undefined });
  }

  async function removeBookmark(): Promise<void> {
    const ok = await openConfirmPopup({
      title: 'Remove bookmark',
      message: 'Remove this bookmark? This cannot be undone.',
      confirmClass: 'btn btn-error btn-sm',
    });
    if (!ok) return;
    profileBookmarksService.removeProfile(bookmark.address);
  }
</script>

<div class="space-y-3">
  <div class="rounded-lg border border-base-200 p-2">
    <Avatar address={bookmark.address as Address} view="horizontal" clickable={true} showTypeInfo={true} />
  </div>

  <div class="rounded-lg border border-base-200 p-3 space-y-2 text-sm">
    <div>
      <div class="text-xs opacity-60">Address</div>
      <div class="font-mono break-all">{bookmark.address}</div>
    </div>
    <div>
      <div class="text-xs opacity-60">Bookmarked</div>
      <div>{formatCreatedAt(bookmark.createdAt)}</div>
    </div>
    <div>
      <div class="text-xs opacity-60">Folder</div>
      <div class="flex items-center gap-2 mt-1">
        <select class="select select-bordered select-sm" bind:value={selectedFolder}>
          <option value="__none__">No folder</option>
          {#each folders as folder (folder)}
            <option value={folder}>{folder}</option>
          {/each}
        </select>
        <button class="btn btn-sm" type="button" onclick={moveToSelectedFolder}>Apply</button>
      </div>
    </div>
  </div>

  <div class="rounded-lg border border-base-200 p-3">
    <div class="text-xs opacity-60 mb-1">Note</div>
    {#if bookmark.note}
      <div class="text-sm whitespace-pre-wrap">{bookmark.note}</div>
    {:else}
      <div class="text-sm opacity-60">No note saved.</div>
    {/if}
  </div>

  <div class="flex justify-end gap-2">
    {#if bookmark.note}
      <button class="btn btn-ghost btn-sm" type="button" onclick={clearNote}>Clear note</button>
    {/if}
    <button class="btn btn-ghost btn-sm" type="button" onclick={removeBookmark}>Remove bookmark</button>
  </div>
</div>
