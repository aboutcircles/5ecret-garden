<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import {
    profileBookmarksService,
    profileBookmarksStore,
    type ProfileBookmark,
  } from '$lib/bookmarks/profileBookmarks';

  let bookmarkedProfiles: ProfileBookmark[] = $state([]);

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

  function removeProfile(bookmark: ProfileBookmark): void {
    profileBookmarksService.removeProfile(bookmark.address);
  }

  function clearNote(bookmark: ProfileBookmark): void {
    profileBookmarksService.upsertProfile(bookmark.address, undefined);
  }
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div>
    <h3 class="text-sm font-semibold m-0">Bookmarks</h3>
    <p class="text-xs text-base-content/70 mt-0.5">Saved profiles on this device.</p>
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if bookmarkedProfiles.length === 0}
    <div class="text-sm opacity-70">
      No profile bookmarks yet. Open a profile popup and tap the star to save it.
    </div>
  {:else}
    <div class="space-y-2">
      {#each bookmarkedProfiles as bookmark (bookmark.address)}
        <div class="border border-base-200 rounded-lg px-2 py-2 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <Avatar address={bookmark.address} view="horizontal" />
            </div>
            <button class="btn btn-ghost btn-xs" type="button" onclick={() => removeProfile(bookmark)}>
              Remove
            </button>
          </div>

          <div class="text-xs text-base-content/60">
            Bookmarked: {formatCreatedAt(bookmark.createdAt)}
          </div>

          {#if bookmark.note}
            <div class="rounded-md bg-base-200/60 px-2 py-1 text-xs whitespace-pre-wrap">
              {bookmark.note}
            </div>
            <div class="flex justify-end">
              <button class="btn btn-ghost btn-xs" type="button" onclick={() => clearNote(bookmark)}>
                Clear note
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>
