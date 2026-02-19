<script lang="ts">
    import { popupControls } from '$lib/shared/state/popup';
    import { runTask } from '$lib/shared/utils/tasks';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/areas/market/offers';
    import { removeProfileFromCache } from '$lib/shared/utils/profile';
    import type { Address } from '@aboutcircles/sdk-types';
    import { bytesToHex, keccak256, hexToBytes } from '$lib/shared/integrations/safeSigner';
    import { secp256k1 } from '@noble/curves/secp256k1';

    interface Props {
        avatar: Address | null;
        pinApiBase?: string;
    }

    let { avatar, pinApiBase }: Props = $props();

    let publicKey = $state('');
    let privateKey = $state<string | null>(null);
    let fingerprint = $state<string | null>(null);
    let error = $state<string | null>(null);
    let saving = $state(false);
    let showPrivate = $state(false);
    let copied = $state<null | 'private' | 'public' | 'fingerprint'>(null);

    function getBindings(): ProfilesBindings {
        return getProfilesBindings({ pinApiBase }).bindings;
    }

    function onGenerate() {
        error = null;
        try {
            const priv = crypto.getRandomValues(new Uint8Array(32));
            const privHex = bytesToHex(priv);
            const pubBytes = secp256k1.getPublicKey(priv, false);
            const pubHex = bytesToHex(pubBytes);
            // compute fingerprint from XY (drop 0x04)
            const xy = hexToBytes(pubHex).slice(1);
            const fp = keccak256(xy).toLowerCase();
            privateKey = privHex;
            publicKey = pubHex;
            fingerprint = fp;
            showPrivate = false; // default to hidden
            copied = null;
        } catch (e: any) {
            error = String(e?.message ?? e);
        }
    }

    async function onSave() {
        if (!avatar) return;
        const pk = publicKey.trim();
        if (!pk) {
            error = 'Public key is required';
            return;
        }
        error = null;
        saving = true;
        const bindings = getBindings();
        await runTask({
            name: 'Adding signing key…',
            promise: (async () => {
                const { profile } = await loadProfileOrInit(bindings, avatar!);
                const nowSec = Math.floor(Date.now() / 1000);
                const entries = typeof profile.signingKeys === 'object' && profile.signingKeys ? { ...profile.signingKeys } : {};

                try {
                    const xy = hexToBytes(pk).slice(1);
                    const fp = keccak256(xy).toLowerCase();
                    entries[fp] = {
                        '@context': 'https://aboutcircles.com/contexts/circles-profile/',
                        '@type': 'SigningKey',
                        publicKey: pk,
                        validFrom: nowSec,
                        validTo: null,
                        revokedAt: null,
                    };
                } catch (e) {
                    entries[pk] = {
                        '@context': 'https://aboutcircles.com/contexts/circles-profile/',
                        '@type': 'SigningKey',
                        publicKey: pk,
                        validFrom: nowSec,
                        validTo: null,
                        revokedAt: null,
                    };
                }

                const cid = await rebaseAndSaveProfile(bindings, avatar!, (p: any) => {
                    p.signingKeys = entries;
                });
                await bindings.updateAvatarProfileDigest(avatar!, cid);
                // Invalidate caches so avatar/name updates propagate in hot paths
                removeProfileFromCache(avatar!);
            })()
        });
        saving = false;
        // Clear sensitive data from state before closing
        privateKey = null;
        fingerprint = null;
        showPrivate = false;
        copied = null;
        popupControls.close();
    }

    function onCancel() {
        // Clear sensitive data before leaving
        privateKey = null;
        fingerprint = null;
        showPrivate = false;
        copied = null;
        popupControls.back?.() ?? popupControls.close();
    }

    async function copyToClipboard(text: string, what: 'private' | 'public' | 'fingerprint') {
        try {
            await navigator.clipboard.writeText(text);
            copied = what;
            setTimeout(() => { if (copied === what) copied = null; }, 1500);
        } catch (e) {
            console.error('Clipboard copy failed', e);
        }
    }
</script>

<div class="space-y-3">
    <div class="text-sm opacity-70">
        Add a new signing key to your profile. Only the public key is stored. Keep private keys safe.
    </div>

    {#if error}
        <div class="alert alert-warning text-xs">{error}</div>
    {/if}

    <div class="rounded-md p-2 bg-base-100/60 space-y-2">
        <div class="flex items-center justify-between">
            <div class="text-xs font-semibold">Create in browser</div>
            <button class="btn btn-xs btn-outline" onclick={onGenerate}>Generate key pair</button>
        </div>

        {#if privateKey}
            <div class="mt-1 text-[11px] opacity-70 flex items-center justify-between">
                <span>Private key (keep secret)</span>
                <label class="flex items-center gap-2 text-[11px]">
                    <input type="checkbox" class="toggle toggle-xs" bind:checked={showPrivate}>
                    <span>Show private key</span>
                </label>
            </div>
            <div class="flex items-center gap-2">
                {#if showPrivate}
                    <code class="break-all text-[11px] block flex-1">{privateKey}</code>
                {:else}
                    <code class="break-all text-[11px] block flex-1 select-none">••••••••••••••••••••••••••••••••••••••</code>
                {/if}
                <button class="btn btn-xs" title="Copy private key" onclick={() => copyToClipboard(privateKey || '', 'private')}>
                    {copied === 'private' ? 'Copied' : 'Copy'}
                </button>
            </div>
        {/if}

        {#if fingerprint}
            <div class="mt-1 text-[11px] opacity-70 flex items-center justify-between">
                <span>Fingerprint</span>
                <button class="btn btn-ghost btn-xs" onclick={() => copyToClipboard(fingerprint || '', 'fingerprint')}>
                    {copied === 'fingerprint' ? 'Copied' : 'Copy'}
                </button>
            </div>
            <code class="break-all text-[11px] block">{fingerprint}</code>
        {/if}
    </div>

    <label class="form-control">
        <span class="label-text text-xs">Public key (uncompressed 0x04…)</span>
        <div class="flex items-center gap-2">
            <input class="input input-sm input-bordered font-mono flex-1" bind:value={publicKey} placeholder="0x04…" />
            {#if publicKey.trim()}
                <button class="btn btn-ghost btn-xs" onclick={() => copyToClipboard(publicKey.trim(), 'public')}>
                    {copied === 'public' ? 'Copied' : 'Copy'}
                </button>
            {/if}
        </div>
    </label>

    <div class="flex justify-end gap-2 pt-2">
        <button class="btn btn-ghost btn-sm" onclick={onCancel} disabled={saving}>Cancel</button>
        <button class="btn btn-primary btn-sm" onclick={onSave} disabled={saving || !publicKey.trim() || !avatar}>Save</button>
    </div>
</div>
