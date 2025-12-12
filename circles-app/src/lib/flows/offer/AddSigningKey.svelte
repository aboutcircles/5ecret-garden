<script lang="ts">
    import { get } from 'svelte/store';
    import { popupControls } from '$lib/stores/popUp';
    import { runTask } from '$lib/utils/tasks';
    import { circles } from '$lib/stores/circles';
    import { mkCirclesBindings } from '$lib/offers/mkCirclesBindings';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import type { Address } from '@circles-sdk/utils';
    import { bytesToHex, keccak256, hexToBytes } from '$lib/safeSigner';
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

    function getBindings(): ProfilesBindings {
        const sdk = get(circles);
        if (!sdk) throw new Error('Circles SDK not initialized');
        return mkCirclesBindings(pinApiBase, sdk as any);
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
            })()
        });
        saving = false;
        popupControls.close();
    }

    function onCancel() {
        popupControls.back?.() ?? popupControls.close();
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
            <button class="btn btn-xs btn-outline" on:click={onGenerate}>Generate key pair</button>
        </div>

        {#if privateKey}
            <div class="mt-1 text-[11px] opacity-70">Private key (keep secret):</div>
            <code class="break-all text-[11px] block">{privateKey}</code>
        {/if}

        {#if fingerprint}
            <div class="mt-1 text-[11px] opacity-70">Fingerprint:</div>
            <code class="break-all text-[11px] block">{fingerprint}</code>
        {/if}
    </div>

    <label class="form-control">
        <span class="label-text text-xs">Public key (uncompressed 0x04…)</span>
        <input class="input input-sm input-bordered font-mono" bind:value={publicKey} placeholder="0x04…" />
    </label>

    <div class="flex justify-end gap-2 pt-2">
        <button class="btn btn-ghost btn-sm" on:click={onCancel} disabled={saving}>Cancel</button>
        <button class="btn btn-primary btn-sm" on:click={onSave} disabled={saving || !publicKey.trim() || !avatar}>Save</button>
    </div>
</div>
