<!-- lib/flows/offer/ProfileExplorer.svelte -->
<!-- lib/flows/profile/ProfileExplorer.svelte -->
<script lang="ts">
    import {get} from 'svelte/store';
    import {onMount} from 'svelte';
    import {popupControls} from '$lib/stores/popUp';
    import {runTask} from '$lib/utils/tasks';
    import {circles} from '$lib/stores/circles';
    import {avatarState} from '$lib/stores/avatar.svelte';

    import ProfileNamespaces from './ProfileNamespaces.svelte';
    import ProfileHeaderEditor from '$lib/flows/offer/ProfileHeaderEditor.svelte';

    import {normalizeAddress} from '$lib/offers/adapters';
    import type {CirclesBindings} from '$lib/offers/namespaces';
    import {loadProfileOrInit, rebaseAndSaveProfile} from '$lib/offers/namespaces';
    import type {CidV0} from '$lib/offers/cid';
    import {mkCirclesBindings} from '$lib/offers/mkCirclesBindings';

    import {keccak256, hexToBytes, bytesToHex} from '$lib/safeSigner';
    import {secp256k1} from '@noble/curves/secp256k1';
    import type {Address} from '@circles-sdk/utils';

    interface Props {
        avatar?: Address;
        pinApiBase?: string;
    }

    let {avatar, pinApiBase}: Props = $props();

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

    // add-key form state
    let newSigningPublicKey = $state('');

    // locally generated key (never stored in profile)
    let generatedPrivateKey = $state<string | null>(null);
    let generatedPublicKey = $state<string | null>(null);
    let generatedFingerprint = $state<string | null>(null);
    let copyPrivateKeyState: 'idle' | 'copied' = $state('idle');

    // editability
    let readonly = $state<boolean>(true);
    let connected = $derived((avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase())
    let ra = $derived((resolvedAvatar ?? '').toLowerCase());
    let isOwner = $derived(!!connected && !!ra && connected === ra);

    $effect(() => {
        readonly = !isOwner;
    });

    function getBindings(): CirclesBindings {
        const sdk = get(circles);
        if (!sdk) {
            throw new Error('Circles SDK not initialized');
        }
        return mkCirclesBindings(pinApiBase, sdk as any);
    }

    async function loadProfile(): Promise<void> {
        loading = true;
        error = null;

        try {
            // If no explicit avatar is passed, default to the currently connected avatar from app state
            const rawAvatar =
                avatar ?? ((avatarState.avatar?.address as string | undefined) ?? (avatarState.avatar?.avatarInfo?.avatar as string | undefined) ?? '');
            const norm = normalizeAddress(rawAvatar);
            resolvedAvatar = norm;

            const {profile} = await loadProfileOrInit(getBindings(), norm);

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

    function clearImages(): void {
        if (readonly) return;
        imageUrl = '';
        previewImageUrl = '';
    }

    function computeFingerprint(pubKeyHexRaw: string): string {
        const value = pubKeyHexRaw.trim();
        const hasPrefix = value.startsWith('0x');
        const body = hasPrefix ? value.slice(2) : value;

        const validShape = hasPrefix && body.length === 130 && /^04[0-9a-fA-F]{128}$/.test(body);
        if (!validShape) {
            throw new Error('Public key must be uncompressed secp256k1 (0x04 + 128 hex chars).');
        }

        const bytes = hexToBytes(value as any);
        if (bytes.length !== 65) {
            throw new Error('Public key must be 65 bytes (0x04 + 64-byte XY).');
        }

        const raw = bytes.slice(1); // drop 0x04 prefix
        const fp = keccak256(raw); // 0x + 64-hex
        return fp.toLowerCase();
    }

    function getRandomBytes32(): Uint8Array {
        const hasCrypto =
            typeof globalThis !== 'undefined' &&
            typeof globalThis.crypto?.getRandomValues === 'function';

        if (!hasCrypto) {
            throw new Error('Secure random generator is not available in this environment');
        }

        const out = new Uint8Array(32);
        globalThis.crypto.getRandomValues(out);
        return out;
    }

    function addSigningKeyFromPublicKey(pkRaw: string): string {
        if (readonly) return '';
        const value = pkRaw.trim();
        if (!value) {
            throw new Error('Public key is required.');
        }

        const fp = computeFingerprint(value);
        const nowSec = Math.floor(Date.now() / 1000);

        const next = {...signingKeys};
        next[fp] = {
            '@context': 'https://aboutcircles.com/contexts/circles-profile/',
            '@type': 'SigningKey',
            publicKey: value,
            validFrom: nowSec,
            validTo: null,
            revokedAt: null
        };
        signingKeys = next;
        return fp;
    }

    function addSigningKey(): void {
        if (readonly) return;
        const pkRaw = newSigningPublicKey.trim();
        if (!pkRaw) {
            throw new Error('Public key is required.');
        }

        addSigningKeyFromPublicKey(pkRaw);
        newSigningPublicKey = '';
    }

    function generateSigningKey(): void {
        if (readonly) return;
        const privBytes = getRandomBytes32();
        const privHex = bytesToHex(privBytes);

        const pubBytes = secp256k1.getPublicKey(privBytes, false); // uncompressed (0x04 + XY)
        const pubHex = bytesToHex(pubBytes);

        const fp = addSigningKeyFromPublicKey(pubHex);

        generatedPrivateKey = privHex;
        generatedPublicKey = pubHex;
        generatedFingerprint = fp;
        newSigningPublicKey = pubHex; // also fill the manual field so user can see / reuse it
        copyPrivateKeyState = 'idle';
    }

    async function copyGeneratedPrivateKey(): Promise<void> {
        if (!generatedPrivateKey) {
            return;
        }
        try {
            await navigator.clipboard.writeText(generatedPrivateKey);
            copyPrivateKeyState = 'copied';
            setTimeout(() => {
                copyPrivateKeyState = 'idle';
            }, 2000);
        } catch {
            // ignore clipboard errors
        }
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
        {#if resolvedAvatar}
            <div class="text-[11px] font-mono opacity-60 break-all">
                Avatar:&nbsp;<code>{resolvedAvatar}</code>
            </div>
        {/if}

        <!-- Profile header: avatar, inline name/location editing, description + image upload -->
        <ProfileHeaderEditor
                bind:name={name}
                bind:description={description}
                bind:location={location}
                bind:previewImageUrl={previewImageUrl}
                bind:imageUrl={imageUrl}
                {readonly}
        />

        <!-- Namespaces -->
        <section aria-label="Namespaces" class="space-y-2">
            <div class="flex items-center justify-between">
                <div class="font-semibold text-sm">Namespaces</div>
                <div class="text-[11px] opacity-60">
                    Each namespace is another profile or app writing into this one.
                </div>
            </div>

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
        </section>

        <!-- Signing keys -->
        <section aria-label="Signing keys" class="space-y-3">
            <div class="flex items-center justify-between">
                <div class="font-semibold text-sm">Signing keys</div>
                <div class="text-[11px] opacity-60">
                    Operator / app keys that can pre-sign links for this profile.
                </div>
            </div>

            {#if signingKeyEntries.length === 0}
                <div class="text-sm opacity-70">No signing keys.</div>
            {:else}
                <div class="space-y-1 max-h-48 overflow-auto text-xs">
                    {#each signingKeyEntries as [fp, meta]}
                        <div class="flex items-start gap-2 border border-base-200 rounded-md px-2 py-1.5 bg-base-100/70">
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
                                            class="btn btn-xs btn-outline"
                                            on:click={() => revokeSigningKey(fp)}
                                    >
                                        Revoke now
                                    </button>
                                    <button
                                            type="button"
                                            class="btn btn-xs btn-outline"
                                            on:click={() => removeSigningKey(fp)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- Add / generate signing key -->
            {#if !readonly}
                <div class="mt-2 border rounded-md p-3 space-y-3 bg-base-100/60 text-xs">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <div class="font-semibold">Signing key tools</div>
                            <p class="opacity-70">
                                Generate a new secp256k1 key pair in this browser or paste an existing public key.
                                Only the public key is stored in your profile.
                            </p>
                        </div>
                        <button
                                type="button"
                                class="btn btn-xs btn-outline"
                                on:click={generateSigningKey}
                        >
                            Generate key
                        </button>
                    </div>

                    {#if generatedPrivateKey}
                        <div class="border rounded-md p-2 bg-base-200/60 space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-semibold">New key generated</span>
                                <span class="text-[11px] text-error font-semibold">
                                Store this private key safely.
                            </span>
                            </div>

                            <div class="mt-1 text-[11px] opacity-70">
                                Private key (keep secret):
                            </div>
                            <div class="mt-1 flex items-start gap-2">
                                <code class="break-all text-[11px] flex-1">
                                    {generatedPrivateKey}
                                </code>
                                <button
                                        type="button"
                                        class="btn btn-ghost btn-xs"
                                        on:click={copyGeneratedPrivateKey}
                                >
                                    {copyPrivateKeyState === 'copied' ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            {#if generatedPublicKey}
                                <div class="mt-1 text-[11px] opacity-70">
                                    Public key (stored in profile):
                                </div>
                                <div class="mt-1">
                                    <code class="break-all text-[11px]">
                                        {generatedPublicKey}
                                    </code>
                                </div>
                            {/if}

                            {#if generatedFingerprint}
                                <div class="mt-1 text-[11px] opacity-70">
                                    Fingerprint:&nbsp;<code>{generatedFingerprint}</code>
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <div class="border-t border-base-200 pt-2 mt-2 space-y-2">
                        <p class="opacity-70">
                            Or paste an uncompressed secp256k1 public key (<code>0x04…</code>). The fingerprint is
                            computed as keccak256(XY).
                        </p>
                        <label class="form-control mt-1">
                            <span class="label-text text-xs">Public key</span>
                            <input
                                    class="input input-sm input-bordered font-mono"
                                    bind:value={newSigningPublicKey}
                                    placeholder="0x04…"
                            />
                        </label>
                        <div class="flex justify-end">
                            <button
                                    type="button"
                                    class="btn btn-xs btn-primary"
                                    on:click={addSigningKey}
                            >
                                Add key
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <div class="mt-4 flex justify-end gap-2">
            <button
                    type="button"
                    class="btn"
                    on:click={popupControls.close}
            >
                {readonly ? 'Close' : 'Cancel'}
            </button>
            {#if !readonly}
                <button
                        type="button"
                        class="btn btn-primary"
                        on:click={saveProfile}
                >
                    Save
                </button>
            {/if}
        </div>
    </div>
{/if}
