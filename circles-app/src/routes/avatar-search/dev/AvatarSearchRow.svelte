<script lang="ts">
  import SharedAvatarSearchRow from '$lib/shared/ui/avatar-search/AvatarSearchRow.svelte';
  import type { AvatarSearchItem } from './avatarSearch.types';

  interface Props {
    item: AvatarSearchItem;
  }

  let { item }: Props = $props();

</script>
<SharedAvatarSearchRow {item} />
