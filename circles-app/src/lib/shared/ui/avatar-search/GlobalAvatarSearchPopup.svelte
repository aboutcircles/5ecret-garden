<script lang="ts">
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
</script>

<div class="w-full space-y-2" tabindex="-1" data-popup-initial-focus>
  <SearchAvatar
    searchType="global"
    inputDataAttribute="data-popup-initial-input"
    onselect={(address) => openProfilePopup(address)}
  />
</div>
