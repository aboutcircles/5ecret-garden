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
    import type { Profile } from '@circles-sdk/profiles';
    import { validateProfile } from '$lib/shared/ui/profile/profileValidation';
    import { isDataUrl } from '$lib/shared/media/imageTools';
    import { T } from '$lib/design-system/tokens.js';

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
    let validationErrors = $state<string[] | null>(null);

    let name = $state('');
    let description = $state('');
    let location = $state('');
    let imageUrl = $state('');
    let previewImageUrl = $state('');
    let initialName = $state('');
    let initialDescription = $state('');
    let initialLocation = $state('');
    let initialImageUrl = $state('');
    let initialPreviewImageUrl = $state('');

    // editability
    let readonly = $state<boolean>(true);
    let connected = $derived((avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase())
    let ra = $derived((resolvedAvatar ?? '').toLowerCase());
    let isOwner = $derived(!!connected && !!ra && connected === ra);
    const hasChanges = $derived(
        name !== initialName ||
        description !== initialDescription ||
        location !== initialLocation ||
        imageUrl !== initialImageUrl ||
        previewImageUrl !== initialPreviewImageUrl
    );
    const canSave = $derived(isOwner && hasChanges && name.trim().length > 0);

    $effect(() => {
        readonly = !isOwner;
    });

    $effect(() => {
        const touched =
            name !== initialName ||
            description !== initialDescription ||
            location !== initialLocation ||
            imageUrl !== initialImageUrl ||
            previewImageUrl !== initialPreviewImageUrl;
        if (touched) {
            validationErrors = null;
        }
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

            initialName = name;
            initialDescription = description;
            initialLocation = location;
            initialImageUrl = imageUrl;
            initialPreviewImageUrl = previewImageUrl;

        } catch (e: any) {
            error = String(e?.message ?? e);
        } finally {
            loading = false;
        }
    }

    function resetChanges(): void {
        name = initialName;
        description = initialDescription;
        location = initialLocation;
        imageUrl = initialImageUrl;
        previewImageUrl = initialPreviewImageUrl;
    }

    async function saveProfile(): Promise<void> {
        if (!resolvedAvatar) return;

        // Backward compatibility: older profile editors could persist base64 data URLs in imageUrl.
        // Keep data-url image payload in previewImageUrl and clear imageUrl to preserve URL semantics.
        if (isDataUrl(imageUrl)) {
            if (!previewImageUrl) {
                previewImageUrl = imageUrl;
            }
            imageUrl = '';
        }

        validationErrors = await validateProfile({
            name,
            description,
            imageUrl,
            previewImageUrl,
        } as Profile);
        if (validationErrors.length > 0) {
            return;
        }

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

        // Save succeeded.
        validationErrors = null;
        initialName = name;
        initialDescription = description;
        initialLocation = location;
        initialImageUrl = imageUrl;
        initialPreviewImageUrl = previewImageUrl;
    }

    onMount(() => {
        void loadProfile();
    });
</script>

<div style="display:flex;flex-direction:column;gap:16px;">
    {#if error}
        <div style="font-size:12px;color:{T.negative};background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);border-radius:10px;padding:10px 14px;">{error}</div>
    {/if}

    {#if validationErrors && validationErrors.length > 0}
        <div style="font-size:12px;color:{T.negative};background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);border-radius:10px;padding:10px 14px;">
            <div style="font-weight:600;">Profile validation error</div>
            <ul style="list-style:disc;margin-left:16px;">
                {#each validationErrors as ve}
                    <li>{ve}</li>
                {/each}
            </ul>
        </div>
    {/if}

    <!-- Header editor panel -->
    <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:16px;box-shadow:{T.shadow.xs};">
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
        <div style="position:sticky;bottom:0;z-index:10;background:rgba(255,255,255,0.9);backdrop-filter:blur(8px);border:1px solid {T.hairlineSoft};border-radius:14px;padding:12px;display:flex;align-items:center;justify-content:flex-end;gap:8px;">
            <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;" type="button" onclick={resetChanges} disabled={!hasChanges}>Cancel</button>
            <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);" type="button" onclick={saveProfile} disabled={!canSave}>Save</button>
        </div>
    {/if}
</div>
