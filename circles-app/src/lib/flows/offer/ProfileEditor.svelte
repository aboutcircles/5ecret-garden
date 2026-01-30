<script lang="ts">
    import {avatarState} from '$lib/stores/avatar.svelte';
    import type { AppProfile as Profile } from '$lib/profiles';
    import { normalizeMarkdownInput, sanitizeText } from '$lib/utils/isValid';
    import ProfileHeaderEditor from '$lib/profile/ProfileHeaderEditor.svelte';

    interface Props {
        profile: Profile;
        showCustomizableFields?: boolean;
    }

    let {profile = $bindable(), showCustomizableFields = true}: Props = $props();

    $effect(() => {
        profile.name = sanitizeText(profile.name);
    });
</script>

<div class="space-y-4">
    {#if avatarState.avatar}
        <label class="form-control">
            <span class="label-text">Circles address</span>
            <input
                    type="text"
                    readonly
                    class="input input-bordered w-full"
                    value={avatarState.avatar?.avatarInfo?.avatar}
            />
        </label>

        {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
            <label class="form-control">
                <span class="label-text">Token address</span>
                <input
                        type="text"
                        readonly
                        class="input input-bordered w-full"
                        value={avatarState.avatar.avatarInfo.v1Token}
                />
            </label>
        {/if}
    {/if}

    {#if showCustomizableFields}
        <ProfileHeaderEditor
                bind:name={profile.name}
                bind:description={profile.description}
                bind:location={profile.location}
                bind:previewImageUrl={profile.previewImageUrl}
                bind:imageUrl={profile.imageUrl}
        />
    {/if}
</div>
