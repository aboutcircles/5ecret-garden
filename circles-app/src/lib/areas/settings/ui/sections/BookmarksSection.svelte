<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { openStep } from '$lib/shared/flow';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import {
    ChevronDown as LChevronDown,
    ChevronRight as LChevronRight,
    Folder as LFolder,
    GripVertical as LGripVertical,
    Trash2 as LTrash2,
  } from 'lucide';
  import {
    bookmarksStateStore,
    profileBookmarksUnpublishedChangesStore,
    profileBookmarksService,
    profileBookmarksStore,
    VIP_BOOKMARK_FOLDER,
    type ProfileBookmark,
  } from '$lib/areas/settings/state/profileBookmarks';
  import BookmarkDetailsPopup from './BookmarkDetailsPopup.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { openConfirmPopup } from '$lib/shared/ui/shell/confirmDialogs';
  import { T } from '$lib/design-system/tokens.js';

  type FolderNode = {
    name: string;
    path: string;
    children: FolderNode[];
    bookmarks: ProfileBookmark[];
  };

  type VisibleFolderRow = {
    path: string;
    name: string;
    depth: number;
    childCount: number;
    bookmarkCount: number;
  };

  let bookmarkedProfiles: ProfileBookmark[] = $state([]);
  let folders: string[] = $state([]);
  let newFolderName: string = $state('');
  let expandedFolders: Record<string, boolean> = $state({});
  let draggingAddress: string | null = $state(null);
  let dragOverFolder: string | null = $state(null);
  let hasUnpublishedProfileChanges = $state(false);
  let loadingFromProfile = $state(false);
  let publishing = $state(false);
  let loadError: string | null = $state(null);
  let loadSuccessAt: number | null = $state(null);
  let publishError: string | null = $state(null);
  let publishSuccessAt: number | null = $state(null);

  const connectedAvatar = $derived(
    (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase(),
  );

  const sortedBookmarks = $derived.by(() => [...bookmarkedProfiles].sort((a, b) => b.createdAt - a.createdAt));

  function splitFolderPath(path: string): string[] {
    return path
      .split('/')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  function parentPath(path: string): string {
    const parts = splitFolderPath(path);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
  }

  function folderDepth(path: string): number {
    return splitFolderPath(path).length - 1;
  }

  function folderName(path: string): string {
    const parts = splitFolderPath(path);
    return parts[parts.length - 1] ?? path;
  }

  function ensureFolderNode(nodes: Map<string, FolderNode>, path: string): FolderNode {
    const existing = nodes.get(path);
    if (existing) return existing;
    const node: FolderNode = { path, name: folderName(path), children: [], bookmarks: [] };
    nodes.set(path, node);
    return node;
  }

  const folderRows = $derived.by((): VisibleFolderRow[] => {
    const nodeMap = new Map<string, FolderNode>();

    for (const folder of folders) {
      const normalized = splitFolderPath(folder).join('/');
      if (!normalized) continue;
      const parts = splitFolderPath(normalized);
      let acc = '';
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        const node = ensureFolderNode(nodeMap, acc);
        const parent = parentPath(acc);
        if (parent) {
          const parentNode = ensureFolderNode(nodeMap, parent);
          if (!parentNode.children.some((v) => v.path === node.path)) parentNode.children.push(node);
        }
      }
    }

    for (const bookmark of sortedBookmarks) {
      const folder = splitFolderPath(bookmark.folder ?? '').join('/');
      if (!folder) continue;
      const node = ensureFolderNode(nodeMap, folder);
      node.bookmarks.push(bookmark);
    }

    for (const node of nodeMap.values()) {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.bookmarks.sort((a, b) => b.createdAt - a.createdAt);
    }

    const roots = Array.from(nodeMap.values()).filter((v) => parentPath(v.path) === '');
    roots.sort((a, b) => a.name.localeCompare(b.name));

    const rows: VisibleFolderRow[] = [];
    const walk = (node: FolderNode) => {
      rows.push({
        path: node.path,
        name: node.name,
        depth: folderDepth(node.path),
        childCount: node.children.length,
        bookmarkCount: node.bookmarks.length,
      });
      if (!isFolderExpanded(node.path)) return;
      for (const child of node.children) walk(child);
    };
    for (const root of roots) walk(root);
    return rows;
  });

  const bookmarksByFolder = $derived.by(() => {
    const map = new Map<string, ProfileBookmark[]>();
    for (const bookmark of sortedBookmarks) {
      const key = splitFolderPath(bookmark.folder ?? '').join('/');
      const arr = map.get(key) ?? [];
      arr.push(bookmark);
      map.set(key, arr);
    }
    return map;
  });

  const uncategorizedBookmarks = $derived.by(() => bookmarksByFolder.get('') ?? []);

  function bookmarksForFolder(path: string): ProfileBookmark[] {
    return bookmarksByFolder.get(path) ?? [];
  }

  function isFolderExpanded(path: string): boolean {
    if (Object.prototype.hasOwnProperty.call(expandedFolders, path)) return !!expandedFolders[path];
    return folderDepth(path) < 1;
  }

  function toggleFolder(path: string): void {
    expandedFolders = { ...expandedFolders, [path]: !isFolderExpanded(path) };
  }

  function expandFolderPath(path: string): void {
    const parts = splitFolderPath(path);
    let acc = '';
    const next = { ...expandedFolders };
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      next[acc] = true;
    }
    expandedFolders = next;
  }

  function formatCreatedAt(ts: number): string {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '';
    }
  }

  $effect(() => {
    const unsubscribe = profileBookmarksStore.subscribe((value) => {
      bookmarkedProfiles = value;
    });
    return () => unsubscribe();
  });

  $effect(() => {
    const unsubscribe = bookmarksStateStore.subscribe((value) => {
      folders = value.folders;
    });
    return () => unsubscribe();
  });

  $effect(() => {
    const unsubscribe = profileBookmarksUnpublishedChangesStore.subscribe((value) => {
      hasUnpublishedProfileChanges = value;
    });
    return () => unsubscribe();
  });

  function createFolder(): void {
    const saved = profileBookmarksService.ensureProfileFolder(newFolderName);
    if (!saved) return;
    expandFolderPath(saved);
    newFolderName = '';
  }

  async function askRemoveFolder(path: string): Promise<void> {
    if (!path) return;
    if (path.toLowerCase() === VIP_BOOKMARK_FOLDER.toLowerCase()) return;

    const deleteFolder = await openConfirmPopup({
      title: 'Delete folder',
      message: `Delete folder “${path}”? By default bookmarks inside are moved to Unsorted.`,
    });
    if (!deleteFolder) return;

    const deleteBookmarks = await openConfirmPopup({
      title: 'Delete bookmarks too?',
      message: 'Also delete all bookmarks inside this folder?',
      confirmLabel: 'Delete bookmarks',
      cancelLabel: 'Keep bookmarks',
      confirmClass: 'btn btn-error btn-sm',
    });

    profileBookmarksService.removeProfileFolder(path, {
      deleteBookmarks,
    });
  }

  function setBookmarkFolderByAddress(address: string, folder: string | undefined): void {
    profileBookmarksService.upsertProfile(address, { folder: folder ?? null });
    if (folder) expandFolderPath(folder);
  }

  function onDragStart(event: DragEvent, bookmark: ProfileBookmark): void {
    draggingAddress = bookmark.address;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', bookmark.address);
    }
  }

  function onDragEnd(): void {
    draggingAddress = null;
    dragOverFolder = null;
  }

  function onFolderDragOver(event: DragEvent, folder: string): void {
    if (!draggingAddress) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dragOverFolder = folder;
  }

  function onFolderDragLeave(folder: string): void {
    if (dragOverFolder === folder) dragOverFolder = null;
  }

  function onFolderDrop(event: DragEvent, folder: string | undefined): void {
    event.preventDefault();
    const fromTransfer = event.dataTransfer?.getData('text/plain')?.trim() || '';
    const address = fromTransfer || draggingAddress || '';
    if (!address) {
      dragOverFolder = null;
      return;
    }
    setBookmarkFolderByAddress(address, folder);
    dragOverFolder = null;
    draggingAddress = null;
  }

  function openBookmarkDetails(bookmark: ProfileBookmark): void {
    openStep({
      title: 'Bookmark details',
      component: BookmarkDetailsPopup,
      props: {
        bookmark,
      },
    });
  }

  async function publishInProfile(): Promise<void> {
    if (!connectedAvatar || publishing) return;
    publishing = true;
    publishError = null;
    publishSuccessAt = null;

    try {
      await runTask({
        name: 'Publishing bookmarks to profile…',
        promise: profileBookmarksService.publishToProfile(),
      });
      publishSuccessAt = Date.now();
    } catch (e: unknown) {
      publishError = e instanceof Error ? e.message : String(e);
    } finally {
      publishing = false;
    }
  }

  async function loadFromProfile(): Promise<void> {
    if (!connectedAvatar || loadingFromProfile) return;
    loadingFromProfile = true;
    loadError = null;
    loadSuccessAt = null;

    try {
      await runTask({
        name: 'Loading bookmarks from profile…',
        promise: profileBookmarksService.syncFromProfile(),
      });
      loadSuccessAt = Date.now();
    } catch (e: unknown) {
      loadError = e instanceof Error ? e.message : String(e);
    } finally {
      loadingFromProfile = false;
    }
  }
</script>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
    <div style="min-width:0;flex:1;">
      <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Bookmarks</h3>
      <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;line-height:1.5;">Local bookmarks are authoritative. Load/save profile data manually.</p>
      {#if connectedAvatar}
        <p style="font-family:{T.fontMono};font-size:10.5px;color:{T.inkSubtle};margin:4px 0 0 0;word-break:break-all;">{connectedAvatar}</p>
      {/if}
    </div>

    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;">
      <button
        type="button"
        style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:12px;font-weight:540;cursor:{(!connectedAvatar || loadingFromProfile) ? 'not-allowed' : 'pointer'};opacity:{(!connectedAvatar || loadingFromProfile) ? 0.5 : 1};"
        onclick={loadFromProfile}
        disabled={!connectedAvatar || loadingFromProfile}
      >
        {#if loadingFromProfile}<span class="loading loading-spinner loading-xs"></span>{/if}
        Load from profile
      </button>

      <button
        type="button"
        style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:9999px;border:0;cursor:{(!connectedAvatar || publishing || !hasUnpublishedProfileChanges) ? 'not-allowed' : 'pointer'};background:{hasUnpublishedProfileChanges ? T.primary : T.pageDeep};color:{hasUnpublishedProfileChanges ? '#fff' : T.inkMuted};font-size:12px;font-weight:580;box-shadow:{hasUnpublishedProfileChanges ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};opacity:{(!connectedAvatar || publishing || !hasUnpublishedProfileChanges) ? 0.5 : 1};"
        onclick={publishInProfile}
        disabled={!connectedAvatar || publishing || !hasUnpublishedProfileChanges}
      >
        {#if publishing}<span class="loading loading-spinner loading-xs"></span>{/if}
        Save to profile
      </button>
    </div>
  </div>
</section>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
    <div style="font-size:11.5px;color:{T.inkMuted};">Drag bookmarks via the grip into folders</div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input
        style="width:160px;padding:6px 10px;border:1px solid {T.hairline};border-radius:9999px;font-family:{T.fontSans};font-size:11.5px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
        type="text"
        maxlength="64"
        placeholder="New folder (e.g. Work)"
        bind:value={newFolderName}
      />
      <button
        type="button"
        style="height:28px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:11px;font-weight:540;cursor:pointer;"
        onclick={createFolder}
      >Add</button>
    </div>
  </div>

  {#if loadError}
    <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:11.5px;color:{T.inkBody};margin-bottom:10px;">{loadError}</div>
  {:else if publishError}
    <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:11.5px;color:{T.inkBody};margin-bottom:10px;">{publishError}</div>
  {:else if loadSuccessAt}
    <div style="background:{T.sageSoft};border:1px solid rgba(45,138,82,0.2);border-radius:10px;padding:8px 12px;font-size:11.5px;color:{T.inkBody};margin-bottom:10px;">Bookmarks loaded from profile (new entries only).</div>
  {:else if publishSuccessAt}
    <div style="background:{T.sageSoft};border:1px solid rgba(45,138,82,0.2);border-radius:10px;padding:8px 12px;font-size:11.5px;color:{T.inkBody};margin-bottom:10px;">Bookmarks saved to profile.</div>
  {/if}

  <div class="space-y-2">
    {#if sortedBookmarks.length === 0 && folders.length === 0}
      <div class="text-sm opacity-70 mb-2">
        No profile bookmarks yet. Open a profile popup and tap the star to save it.
      </div>
    {/if}

      <div
        class={`rounded-lg border border-base-200 ${dragOverFolder === '__none__' ? 'bg-base-200/30' : ''}`}
        role="region"
        aria-label="Unsorted bookmarks drop zone"
        ondragover={(event) => onFolderDragOver(event, '__none__')}
        ondragleave={() => onFolderDragLeave('__none__')}
        ondrop={(event) => onFolderDrop(event, undefined)}
      >
        <div class="px-2 py-2 flex items-center justify-between text-xs font-semibold">
          <span class="inline-flex items-center gap-1.5"><Lucide icon={LFolder} size={14} />Unsorted</span>
          <span class="opacity-60">{uncategorizedBookmarks.length}</span>
        </div>

        {#if uncategorizedBookmarks.length > 0}
          <div class="divide-y divide-base-200">
            {#each uncategorizedBookmarks as bookmark (bookmark.address)}
              <div class="py-1.5 px-2 flex items-center gap-2">
                <button
                  class="btn btn-ghost btn-xs btn-square shrink-0 self-center cursor-grab active:cursor-grabbing"
                  type="button"
                  title="Drag bookmark"
                  draggable="true"
                  ondragstart={(event) => onDragStart(event, bookmark)}
                  ondragend={onDragEnd}
                >
                  <Lucide icon={LGripVertical} size={14} />
                </button>

                <div class="flex-1 min-w-0">
                  <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => openBookmarkDetails(bookmark)}>
                    <div class="min-w-0">
                      <Avatar
                        address={bookmark.address}
                        view="horizontal"
                        bottomInfo={`Bookmarked ${formatCreatedAt(bookmark.createdAt)}`}
                        showTypeInfo={true}
                        clickable={true}
                      />
                    </div>
                    {#snippet trailing()}
                      <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
                    {/snippet}
                  </RowFrame>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#each folderRows as folderRow (folderRow.path)}
        <div
          class={`rounded-lg border border-base-200 ${dragOverFolder === folderRow.path ? 'bg-base-200/30' : ''}`}
          role="region"
          aria-label={`Folder ${folderRow.name} drop zone`}
          ondragover={(event) => onFolderDragOver(event, folderRow.path)}
          ondragleave={() => onFolderDragLeave(folderRow.path)}
          ondrop={(event) => onFolderDrop(event, folderRow.path)}
        >
          <div class="w-full px-2 py-2 flex items-center gap-1">
            <button
              class="flex-1 min-w-0 text-left flex items-center justify-between gap-2 hover:bg-base-200/30 rounded"
              type="button"
              onclick={() => toggleFolder(folderRow.path)}
            >
              <span class="inline-flex items-center gap-1.5 min-w-0" style={`padding-left: ${folderRow.depth * 0.9}rem`}>
                <Lucide icon={isFolderExpanded(folderRow.path) ? LChevronDown : LChevronRight} size={14} />
                <Lucide icon={LFolder} size={14} />
                <span class="text-sm truncate">{folderRow.name}</span>
              </span>
              <span class="text-xs text-base-content/60">
                {folderRow.bookmarkCount}{#if folderRow.childCount > 0} • {folderRow.childCount} subfolders{/if}
              </span>
            </button>

            <button
              class="btn btn-ghost btn-xs btn-square"
              type="button"
              disabled={folderRow.path.toLowerCase() === VIP_BOOKMARK_FOLDER.toLowerCase()}
              title="Delete folder"
              onclick={() => askRemoveFolder(folderRow.path)}
            >
              <Lucide icon={LTrash2} size={13} />
            </button>
          </div>

          {#if isFolderExpanded(folderRow.path) && bookmarksForFolder(folderRow.path).length > 0}
            <div class="divide-y divide-base-200">
              {#each bookmarksForFolder(folderRow.path) as bookmark (bookmark.address)}
                <div class="py-1.5 px-2 flex items-center gap-2">
                  <button
                    class="btn btn-ghost btn-xs btn-square shrink-0 self-center cursor-grab active:cursor-grabbing"
                    type="button"
                    title="Drag bookmark"
                    draggable="true"
                    ondragstart={(event) => onDragStart(event, bookmark)}
                    ondragend={onDragEnd}
                  >
                    <Lucide icon={LGripVertical} size={14} />
                  </button>

                  <div class="flex-1 min-w-0">
                    <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => openBookmarkDetails(bookmark)}>
                      <div class="min-w-0">
                        <Avatar
                          address={bookmark.address}
                          view="horizontal"
                          bottomInfo={`Bookmarked ${formatCreatedAt(bookmark.createdAt)}`}
                          showTypeInfo={true}
                          clickable={true}
                        />
                      </div>
                      {#snippet trailing()}
                        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
                      {/snippet}
                    </RowFrame>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
  </div>
</section>

