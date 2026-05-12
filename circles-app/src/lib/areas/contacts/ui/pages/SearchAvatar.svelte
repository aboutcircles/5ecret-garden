<script lang="ts">
    import type { Address } from '@aboutcircles/sdk-types';
    import type { SearchProfileResult } from '$lib/shared/model/profile';
    import AvatarSearchList from '$lib/shared/ui/avatar-search/AvatarSearchList.svelte';

    interface Props {
        selectedAddress?: any;
        searchType?: 'send' | 'group' | 'contact' | 'global';
        oninvite?: (avatar: any) => void;
        ontrust?: (avatar: any) => void;
        onselect?: (avatar: any, profile?: SearchProfileResult) => void;
        avatarTypes?: string[];
        inputDataAttribute?: string;
    }

    let {
        selectedAddress = $bindable(undefined),
        searchType = 'send',
        oninvite,
        ontrust,
        onselect,
        avatarTypes,
        inputDataAttribute,
    }: Props = $props();
</script>

<div class="mt-4" data-search-avatar-list-scope>
    <AvatarSearchList
      bind:selectedAddress
      {searchType}
      {avatarTypes}
      {inputDataAttribute}
      onselect={(address, profile) => onselect?.(address, profile)}
      oninvite={(address) => oninvite?.(address)}
      ontrust={(address) => ontrust?.(address)}
    />
</div>
