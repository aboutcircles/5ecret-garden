<!-- lib/flows/offer/ProfileExplorer.svelte -->
<!-- lib/flows/profile/ProfileExplorer.svelte -->
<script lang="ts">
    import {onMount} from 'svelte';
    import {popupControls} from '$lib/stores/popUp';
    import {runTask} from '$lib/utils/tasks';
    import {avatarState} from '$lib/stores/avatar.svelte';

    import ProfileNamespaces from './ProfileNamespaces.svelte';
    import ProfileHeaderEditor from '$lib/flows/offer/ProfileHeaderEditor.svelte';
    import AddSigningKey from './AddSigningKey.svelte';
    // Use Lucide icons instead of inline SVGs
    import Lucide from '$lib/icons/Lucide.svelte';
    import { Plus as LPlus, Trash2 as LTrash2, Ban as LBan } from 'lucide';

    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/offers/profilesBindings';
    import { removeProfileFromCache } from '$lib/utils/profile';
    import type {Address} from '@circles-sdk/utils';

    interface Props {
        avatar?: Address;
        pinApiBase?: string;
        showAdvancedSections?: boolean; // when true (Settings page), show Namespaces + Signing keys
    }

    let {avatar, pinApiBase, showAdvancedSections = false}: Props = $props();

    let resolvedAvatar = $state<Address | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);

    let name = $state('');
    let description = $state('');
    let location = $state('');
    let imageUrl = $state('');
    let previewImageUrl = $state('');
    let namespaces = $state<Record<string, string>>({});
    let signingKeys = $state<Record<string, any>>({});

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

            const skObj =
                profile.signingKeys && typeof profile.signingKeys === 'object'
                    ? profile.signingKeys
                    : {};
            signingKeys = {...(skObj as Record<string, any>)};
        } catch (e: any) {
            error = String(e?.message ?? e);
        } finally {
            loading = false;
        }
    }

    function removeSigningKey(fp: string): void {
        if (readonly) return;
        const next = {...signingKeys};
        delete next[fp];
        signingKeys = next;
    }

    function revokeSigningKey(fp: string): void {
        if (readonly) return;
        const meta = signingKeys[fp];
        if (!meta) {
            return;
        }
        const nowSec = Math.floor(Date.now() / 1000);
        const next = {...signingKeys};
        next[fp] = {
            ...meta,
            revokedAt: nowSec
        };
        signingKeys = next;
    }



    async function saveProfile(): Promise<void> {
        if (readonly) return;
        if (!resolvedAvatar) {
            throw new Error('No avatar resolved for profile save');
        }

        const bindings = getBindings();

        await runTask({
            name: 'Saving profile…',
            promise: (async () => {
                const profileCid = await rebaseAndSaveProfile(
                    bindings,
                    resolvedAvatar!,
                    (prof: any) => {
                        prof.name = name ?? '';
                        prof.description = description ?? '';
                        prof.location = location || undefined;
                        prof.imageUrl = imageUrl || undefined;
                        prof.previewImageUrl = previewImageUrl || undefined;
                        prof.namespaces = {...namespaces};
                        prof.signingKeys = {...signingKeys};
                    }
                );

                await bindings.updateAvatarProfileDigest(resolvedAvatar!, profileCid);
                // Invalidate caches so hot-path UIs refresh
                removeProfileFromCache(resolvedAvatar!);
            })()
        });

        popupControls.close();
    }

    onMount(() => {
        void loadProfile();
    });

    /* ─────────── derived UI helpers (Svelte 5 runes) ─────────── */

    let signingKeyEntries = $derived(Object.entries(signingKeys ?? {}));
</script>

{#if loading}
    <div class="p-4 text-sm opacity-70">Loading profile…</div>
{:else if error}
    <div class="p-4 text-sm text-error">
        Failed to load profile: {error}
    </div>
{:else}
    <div class="space-y-4">

        <!-- Profile header: avatar, inline name/location editing, description + image upload -->
        <ProfileHeaderEditor
                bind:name={name}
                bind:description={description}
                bind:location={location}
                bind:previewImageUrl={previewImageUrl}
                bind:imageUrl={imageUrl}
                {readonly}
        />

        {#if showAdvancedSections}
            <!-- Namespaces (visible on Settings page) -->
            <section aria-label="Namespaces" class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="font-semibold text-sm">Namespaces</span>
                    <span class="text-[11px] opacity-60">App or profile sources</span>
                </div>
                <div class="mt-1">
                    {#if resolvedAvatar}
                        <ProfileNamespaces
                            avatar={resolvedAvatar}
                            pinApiBase={pinApiBase}
                            {readonly}
                            {namespaces}
                            on:namespacesChanged={(e) => (namespaces = e.detail)}
                        />
                    {:else}
                        <div class="text-sm opacity-70">No avatar resolved.</div>
                    {/if}
                </div>
            </section>
        {/if}

        {#if showAdvancedSections}
        <!-- Signing keys (visible on Settings page, always expanded) -->
        <section aria-label="Signing keys" class="space-y-2">
            <div class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm">Signing keys</span>
                    <span class="text-[11px] opacity-60">Operator/app keys</span>
                </div>
                {#if !readonly}
                    <button
                        type="button"
                        class="btn btn-xs btn-primary btn-square"
                        disabled={!resolvedAvatar}
                        title="Add signing key"
                        aria-label="Add signing key"
                        onclick={() => popupControls.open({ title: 'Add signing key', component: AddSigningKey, props: { avatar: resolvedAvatar, pinApiBase }, onClose: () => { void loadProfile(); } })}
                    >
                        <Lucide icon={LPlus} size={16} />
                    </button>
                {/if}
            </div>
            <div class="mt-0 space-y-3">
                    {#if signingKeyEntries.length === 0}
                        <div class="text-sm opacity-70">No signing keys.</div>
                    {:else}
                        <div class="space-y-1 max-h-48 overflow-auto text-xs">
                            {#each signingKeyEntries as [fp, meta]}
                                <div class="flex items-start gap-2 border rounded-lg p-2 bg-base-100/60">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2">
                                            <code class="truncate">{fp}</code>
                                            {#if typeof meta?.revokedAt === 'number'}
                                                <span class="badge badge-xs badge-error ml-1">
                                                    revoked
                                                </span>
                                            {/if}
                                        </div>

                                        {#if meta?.publicKey}
                                            <div class="mt-0.5 text-[11px] opacity-70 truncate">
                                                pub:&nbsp;<code>{meta.publicKey}</code>
                                            </div>
                                        {/if}

                                        <div class="mt-0.5 text-[11px] opacity-60 flex flex-wrap gap-x-2 gap-y-0.5">
                                            {#if typeof meta?.validFrom === 'number'}
                                                <span>from={meta.validFrom}</span>
                                            {/if}
                                            {#if typeof meta?.validTo === 'number'}
                                                <span>to={meta.validTo}</span>
                                            {/if}
                                            {#if typeof meta?.revokedAt === 'number'}
                                                <span class="text-error">
                                                    revokedAt={meta.revokedAt}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>

                                    {#if !readonly}
                                        <div class="flex flex-col gap-1">
                                            <button
                                                    type="button"
                                                    class="btn btn-xs btn-ghost btn-square"
                                                    onclick={() => revokeSigningKey(fp)}
                                                    title="Revoke now"
                                                    aria-label="Revoke now"
                                            >
                                                <Lucide icon={LBan} size={16} />
                                            </button>
                                            <button
                                                    type="button"
                                                    class="btn btn-xs btn-ghost btn-square"
                                                    onclick={() => removeSigningKey(fp)}
                                                    title="Remove"
                                                    aria-label="Remove"
                                            >
                                                <Lucide icon={LTrash2} size={16} />
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Inline add/generate removed in favor of dedicated popup flow -->
                </div>
        </section>
        {/if}

        <div class="mt-4 flex justify-end gap-2">
            <button
                    type="button"
                    class="btn"
                    onclick={popupControls.close}
            >
                {readonly ? 'Close' : 'Cancel'}
            </button>
            {#if !readonly}
                <button
                        type="button"
                        class="btn btn-primary"
                        onclick={saveProfile}
                >
                    Save
                </button>
            {/if}
        </div>
    </div>
{/if}
