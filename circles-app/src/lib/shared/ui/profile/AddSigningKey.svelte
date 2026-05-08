<script lang="ts">
    import { popupControls } from '$lib/shared/state/popup';
    import { runTask } from '$lib/shared/utils/tasks';
    import { loadProfileOrInit, rebaseAndSaveProfile } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { getProfilesBindings } from '$lib/areas/market/offers';
    import { removeProfileFromCache } from '$lib/shared/utils/profile';
    import type { Address } from '@circles-sdk/utils';
    import { bytesToHex, keccak256, hexToBytes } from '$lib/shared/integrations/safeSigner';
    import { secp256k1 } from '@noble/curves/secp256k1';
    import { T } from '$lib/design-system/tokens.js';

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

<div style="display:flex;flex-direction:column;gap:14px;">
    <p style="margin:0;font-size:12.5px;color:{T.inkMuted};line-height:1.5;">
        Add a new signing key to your profile. Only the public key is stored. Keep private keys safe.
    </p>

    {#if error}
        <div style="background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:10px;padding:8px 12px;font-size:11.5px;color:{T.inkBody};">{error}</div>
    {/if}

    <!-- Generator card -->
    <div style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Create in browser</span>
            <button
                type="button"
                style="height:28px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:11.5px;font-weight:540;cursor:pointer;"
                onclick={onGenerate}
            >Generate key pair</button>
        </div>

        {#if privateKey}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="font-size:10.5px;color:{T.inkMuted};">Private key (keep secret)</span>
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:10.5px;color:{T.inkMuted};cursor:pointer;">
                    <input type="checkbox" style="accent-color:{T.primary};" bind:checked={showPrivate}>
                    Show
                </label>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                {#if showPrivate}
                    <code style="flex:1;min-width:0;word-break:break-all;font-family:{T.fontMono};font-size:10.5px;color:{T.ink};line-height:1.5;">{privateKey}</code>
                {:else}
                    <code style="flex:1;min-width:0;word-break:break-all;font-family:{T.fontMono};font-size:10.5px;color:{T.inkSubtle};user-select:none;">••••••••••••••••••••••••••••••••••••••</code>
                {/if}
                <button
                    type="button"
                    style="flex-shrink:0;height:24px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:10.5px;font-weight:540;cursor:pointer;"
                    title="Copy private key"
                    onclick={() => copyToClipboard(privateKey || '', 'private')}
                >{copied === 'private' ? 'Copied' : 'Copy'}</button>
            </div>
        {/if}

        {#if fingerprint}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="font-size:10.5px;color:{T.inkMuted};">Fingerprint</span>
                <button
                    type="button"
                    style="height:22px;padding:0 8px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:10.5px;cursor:pointer;"
                    onclick={() => copyToClipboard(fingerprint || '', 'fingerprint')}
                >{copied === 'fingerprint' ? 'Copied' : 'Copy'}</button>
            </div>
            <code style="word-break:break-all;font-family:{T.fontMono};font-size:10.5px;color:{T.ink};line-height:1.5;">{fingerprint}</code>
        {/if}
    </div>

    <label style="display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Public key (uncompressed 0x04…)</span>
        <div style="display:flex;align-items:center;gap:6px;">
            <input
                style="flex:1;min-width:0;padding:9px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontMono};font-size:11px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                bind:value={publicKey}
                placeholder="0x04…"
            />
            {#if publicKey.trim()}
                <button
                    type="button"
                    style="flex-shrink:0;height:30px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11.5px;cursor:pointer;"
                    onclick={() => copyToClipboard(publicKey.trim(), 'public')}
                >{copied === 'public' ? 'Copied' : 'Copy'}</button>
            {/if}
        </div>
    </label>

    <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
        <button
            type="button"
            style="height:36px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:13px;cursor:{saving ? 'not-allowed' : 'pointer'};"
            onclick={onCancel}
            disabled={saving}
        >Cancel</button>
        {@const canSave = !saving && !!publicKey.trim() && !!avatar}
        <button
            type="button"
            style="height:36px;padding:0 18px;border-radius:9999px;border:0;cursor:{canSave ? 'pointer' : 'not-allowed'};background:{canSave ? T.primary : T.pageDeep};color:{canSave ? '#fff' : T.inkMuted};font-size:13px;font-weight:580;box-shadow:{canSave ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};"
            onclick={onSave}
            disabled={!canSave}
        >Save</button>
    </div>
</div>
