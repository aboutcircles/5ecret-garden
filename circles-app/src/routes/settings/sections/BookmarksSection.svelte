<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import {
    ChevronDown as LChevronDown,
    ChevronRight as LChevronRight,
    Folder as LFolder,
    GripVertical as LGripVertical,
    Trash2 as LTrash2,
  } from 'lucide';
  import {
    bookmarksStateStore,
    profileBookmarksService,
    profileBookmarksStore,
    VIP_BOOKMARK_FOLDER,
    type ProfileBookmark,
  } from '$lib/bookmarks/profileBookmarks';
  import BookmarkDetailsPopup from './BookmarkDetailsPopup.svelte';

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

  function createFolder(): void {
    const saved = profileBookmarksService.ensureProfileFolder(newFolderName);
    if (!saved) return;
    expandFolderPath(saved);
    newFolderName = '';
  }

  function removeFolder(path: string): void {
    if (!path) return;
    if (path.toLowerCase() === VIP_BOOKMARK_FOLDER.toLowerCase()) return;
    const ok = window.confirm(
      `Delete folder "${path}"? Bookmarks inside will be moved to “Unsorted”. This cannot be undone.`,
    );
    if (!ok) return;
    profileBookmarksService.removeProfileFolder(path);
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
    popupControls.open({
      title: 'Bookmark details',
      component: BookmarkDetailsPopup,
      props: {
        bookmark,
      },
    });
  }
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div>
    <h3 class="text-sm font-semibold m-0">Bookmarks</h3>
    <p class="text-xs text-base-content/70 mt-0.5">Saved profiles for your currently connected avatar.</p>
    {#if connectedAvatar}
      <p class="text-[11px] text-base-content/60 mt-1 font-mono break-all">{connectedAvatar}</p>
    {/if}
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
    <div class="text-xs text-base-content/70">Drag bookmark items via the grip into folders</div>
    <div class="flex items-center gap-2">
      <input
        class="input input-bordered input-xs w-40"
        type="text"
        maxlength="64"
        placeholder="New folder (e.g. Work/DAO)"
        bind:value={newFolderName}
      />
      <button class="btn btn-xs" type="button" onclick={createFolder}>Add</button>
    </div>
  </div>

  <div class="space-y-2">
    {#if sortedBookmarks.length === 0 && folders.length === 0}
      <div class="text-sm opacity-70 mb-2">
        No profile bookmarks yet. Open a profile popup and tap the star to save it.
      </div>
    {/if}

      <div
        class={`rounded-lg border border-base-200 ${dragOverFolder === '__none__' ? 'bg-base-200/30' : ''}`}
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
              <div class="py-1.5 px-2 flex items-stretch gap-2">
                <button
                  class="btn btn-ghost btn-xs btn-square mt-1 cursor-grab"
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
                      <div onclick={(event) => event.stopPropagation()}>
                        <Avatar
                          address={bookmark.address}
                          view="horizontal"
                          bottomInfo={`Bookmarked ${formatCreatedAt(bookmark.createdAt)}`}
                          showTypeInfo={true}
                          clickable={true}
                        />
                      </div>
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
              onclick={() => removeFolder(folderRow.path)}
            >
              <Lucide icon={LTrash2} size={13} />
            </button>
          </div>

          {#if isFolderExpanded(folderRow.path) && bookmarksForFolder(folderRow.path).length > 0}
            <div class="divide-y divide-base-200">
              {#each bookmarksForFolder(folderRow.path) as bookmark (bookmark.address)}
                <div class="py-1.5 px-2 flex items-stretch gap-2">
                  <button
                    class="btn btn-ghost btn-xs btn-square mt-1 cursor-grab"
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
                        <div onclick={(event) => event.stopPropagation()}>
                          <Avatar
                            address={bookmark.address}
                            view="horizontal"
                            bottomInfo={`Bookmarked ${formatCreatedAt(bookmark.createdAt)}`}
                            showTypeInfo={true}
                            clickable={true}
                          />
                        </div>
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
