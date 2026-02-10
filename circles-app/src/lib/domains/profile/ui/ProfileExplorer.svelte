<!-- lib/profile/ProfileExplorer.svelte -->
<script lang="ts">
    import {onMount} from 'svelte';
    import {popupControls} from '$lib/shared/state/popup';
    import {runTask} from '$lib/shared/utils/tasks';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
import { ProfileNamespaces } from '$lib/domains/profile/ui';
import { ProfileHeaderEditor } from '$lib/domains/profile/ui';
import { ProfileSigningKeys } from '$lib/domains/profile/ui';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/areas/market/offers';
    import { removeProfileFromCache } from '$lib/shared/utils/profile';
    import type {Address} from '@circles-sdk/utils';

    interface Props {
        avatar?: Address;
        pinApiBase?: string;
        showAdvancedSections?: boolean; // legacy: when true (Settings page), show Namespaces + Signing keys
        showNamespaces?: boolean;
        showSigningKeys?: boolean;
    }

    let {
        avatar,
        pinApiBase,
        showAdvancedSections = false,
        showNamespaces,
        showSigningKeys
    }: Props = $props();

    // Backwards-compatible section toggles.
    // If granular props are not provided, fall back to legacy `showAdvancedSections`.
    const namespacesEnabled = $derived(showNamespaces ?? showAdvancedSections);
    const signingKeysEnabled = $derived(showSigningKeys ?? showAdvancedSections);

    let resolvedAvatar = $state<Address | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);

    let name = $state('');
    let description = $state('');
    let location = $state('');
    let imageUrl = $state('');
    let previewImageUrl = $state('');
    let namespaces = $state<Record<string, string>>({});

    // Inline key generation moved to AddSigningKey popup; local generated* state removed

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

            const nsObj =
                profile.namespaces && typeof profile.namespaces === 'object'
                    ? profile.namespaces
                    : {};
            namespaces = {...(nsObj as Record<string, string>)};

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
                    p.namespaces = namespaces;
                });
                await bindings.updateAvatarProfileDigest(resolvedAvatar!, cid);
                removeProfileFromCache(resolvedAvatar!);
            })()
        });
    }

    function onNamespacesChanged(e: CustomEvent<Record<string, string>>): void {
        namespaces = e.detail;
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
        <ProfileHeaderEditor
            bind:name
            bind:description
            bind:location
            bind:imageUrl
            bind:previewImageUrl
            readonly={!isOwner}
        />
    </section>

    {#if namespacesEnabled || signingKeysEnabled}
        <!-- Namespaces panel -->
        {#if namespacesEnabled}
            <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-sm m-0">App data</h3>
                    <span class="text-[11px] opacity-60">App/profile sources</span>
                </div>
                {#if resolvedAvatar}
                    <ProfileNamespaces
                        avatar={resolvedAvatar}
                        {pinApiBase}
                        namespaces={namespaces}
                        readonly={!isOwner}
                        on:namespacesChanged={(e) => onNamespacesChanged(new CustomEvent('namespacesChanged', { detail: e.detail }))}
                    />
                {:else}
                    <div class="text-sm opacity-70">No avatar resolved.</div>
                {/if}
            </section>
        {/if}

        <!-- Signing keys panel -->
        {#if signingKeysEnabled}
            <ProfileSigningKeys avatar={resolvedAvatar} {pinApiBase} readonly={!isOwner} />
        {/if}
    {/if}

    {#if isOwner}
        <div class="flex justify-end">
            <button class="btn btn-primary btn-sm" onclick={saveProfile}>Save</button>
        </div>
    {/if}
</div>
