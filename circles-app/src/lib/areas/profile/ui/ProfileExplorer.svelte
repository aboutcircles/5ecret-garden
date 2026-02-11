<!-- lib/profile/ProfileExplorer.svelte -->
<script lang="ts">
    import {onMount} from 'svelte';
    import {runTask} from '$lib/shared/utils/tasks';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import { ProfileFormStep } from '$lib/shared/ui/profile';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/areas/market/offers';
    import { removeProfileFromCache } from '$lib/shared/utils/profile';
    import type {Address} from '@circles-sdk/utils';

    interface Props {
        avatar?: Address;
        pinApiBase?: string;
    }

    let {
        avatar,
        pinApiBase
    }: Props = $props();

    let resolvedAvatar = $state<Address | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);

    let name = $state('');
    let description = $state('');
    let location = $state('');
    let imageUrl = $state('');
    let previewImageUrl = $state('');

    // editability
    let readonly = $state<boolean>(true);
    let connected = $derived((avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase())
    let ra = $derived((resolvedAvatar ?? '').toLowerCase());
    let isOwner = $derived(!!connected && !!ra && connected === ra);

    $effect(() => {
        readonly = !isOwner;
    });

    function getBindings(): ProfilesBindings {
        return getProfilesBindings({ pinApiBase }).bindings;
    }

    async function loadProfile(): Promise<void> {
        loading = true;
        error = null;

        try {
            // If no explicit avatar is passed, default to the currently connected avatar from app state
            const rawAvatar =
                avatar ?? ((avatarState.avatar?.address as string | undefined) ?? (avatarState.avatar?.avatarInfo?.avatar as string | undefined) ?? '');
            const norm = normalizeAddress(rawAvatar) as Address;
            resolvedAvatar = norm;

            const {profile} = await loadProfileOrInit(getBindings(), norm as Address);

            name = String(profile.name ?? '');
            description = String(profile.description ?? '');
            location = typeof profile.location === 'string' ? profile.location : '';
            imageUrl = typeof profile.imageUrl === 'string' ? profile.imageUrl : '';
            previewImageUrl =
                typeof profile.previewImageUrl === 'string'
                    ? profile.previewImageUrl
                    : '';

        } catch (e: any) {
            error = String(e?.message ?? e);
        } finally {
            loading = false;
        }
    }

    async function saveProfile(): Promise<void> {
        if (!resolvedAvatar) return;
        const bindings = getBindings();
        await runTask({
            name: 'Saving profile…',
            promise: (async () => {
                const cid = await rebaseAndSaveProfile(bindings, resolvedAvatar!, (p: any) => {
                    p.name = name;
                    p.description = description;
                    p.location = location;
                    p.imageUrl = imageUrl || null;
                    p.previewImageUrl = previewImageUrl || null;
                });
                await bindings.updateAvatarProfileDigest(resolvedAvatar!, cid);
                removeProfileFromCache(resolvedAvatar!);
            })()
        });
    }

    onMount(() => {
        void loadProfile();
    });
</script>

<div class="space-y-4">
    {#if error}
        <div class="alert alert-error text-xs">{error}</div>
    {/if}

    <!-- Header editor panel -->
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm">
        <ProfileFormStep
            bind:name
            bind:description
            bind:location
            bind:imageUrl
            bind:previewImageUrl
            readonly={!isOwner}
            showSubmit={false}
        />
    </section>

    {#if isOwner}
        <div class="flex justify-end">
            <button class="btn btn-primary btn-sm" onclick={saveProfile}>Save</button>
        </div>
    {/if}
</div>
