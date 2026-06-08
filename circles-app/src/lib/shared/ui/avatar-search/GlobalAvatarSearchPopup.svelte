<script lang="ts">
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
</script>

<div style="width:100%;display:flex;flex-direction:column;gap:8px;" tabindex="-1" data-popup-initial-focus>
  <SearchAvatar
    searchType="global"
    inputDataAttribute="data-popup-initial-input"
    onselect={(address) => openProfilePopup(address)}
  />
</div>
