<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import {
    bookmarksStateStore,
    profileBookmarksService,
    type ProfileBookmark,
  } from '$lib/areas/settings/state/profileBookmarks';
  import { openConfirmPopup } from '$lib/shared/ui/shell/confirmDialogs';
  import { T } from '$lib/design-system/tokens.js';

  interface Props { bookmark: ProfileBookmark; }
  let { bookmark }: Props = $props();

  let folders: string[] = $state([]);
  let selectedFolder: string = $state(bookmark.folder ?? '__none__');

  function formatCreatedAt(ts: number): string {
    try { return new Date(ts).toLocaleString(); } catch { return ''; }
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
      confirmClass: 'btn btn-error w-full sm:w-auto sm:min-w-[120px]',
    });
    if (!ok) return;
    profileBookmarksService.removeProfile(bookmark.address);
  }
</script>

<div style="display:flex;flex-direction:column;gap:12px;">
  <!-- Profile header card -->
  <div style="
    background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:14px 16px;box-shadow:{T.shadow.xs};
  ">
    <Avatar address={bookmark.address} view="horizontal" clickable={true} showTypeInfo={true} />
  </div>

  <!-- Detail card -->
  <div style="
    background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
    overflow:hidden;
  ">
    <!-- Address row -->
    <div style="padding:12px 14px;border-bottom:1px solid {T.hairlineSoft};">
      <div style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Address</div>
      <div style="font-family:{T.fontMono};font-size:12px;color:{T.ink};word-break:break-all;line-height:1.4;">{bookmark.address}</div>
    </div>

    <!-- Bookmarked row -->
    <div style="padding:12px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:12.5px;color:{T.inkMuted};">Bookmarked</span>
      <span style="font-size:12.5px;color:{T.ink};font-weight:540;">{formatCreatedAt(bookmark.createdAt)}</span>
    </div>

    <!-- Folder row -->
    <div style="padding:12px 14px;display:flex;flex-direction:column;gap:8px;">
      <span style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Folder</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <select style="flex:1;height:32px;padding:0 10px;border:1px solid {T.hairline};border-radius:9px;background:{T.surface};font-family:{T.fontSans};font-size:13px;color:{T.ink};outline:none;" bind:value={selectedFolder}>
          <option value="__none__">No folder</option>
          {#each folders as folder (folder)}
            <option value={folder}>{folder}</option>
          {/each}
        </select>
        <button
          type="button"
          onclick={moveToSelectedFolder}
          style="
            height:32px;padding:0 14px;border-radius:9999px;cursor:pointer;
            background:{T.primary};color:#fff;border:0;
            font-family:{T.fontSans};font-size:12px;font-weight:540;
            box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;
          "
        >Apply</button>
      </div>
    </div>
  </div>

  <!-- Note card -->
  <div style="
    background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:12px 14px;
  ">
    <div style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">Note</div>
    {#if bookmark.note}
      <div style="font-size:13px;color:{T.ink};line-height:1.5;white-space:pre-wrap;">{bookmark.note}</div>
    {:else}
      <div style="font-size:12.5px;color:{T.inkMuted};">No note saved.</div>
    {/if}
  </div>

  <!-- Actions -->
  <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;flex-wrap:wrap;">
    {#if bookmark.note}
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;" type="button" onclick={clearNote}>Clear note</button>
    {/if}
    <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.negative};cursor:pointer;font-family:{T.fontSans};font-size:13px;" type="button" onclick={removeBookmark}>
      Remove bookmark
    </button>
  </div>
</div>
