<script lang="ts">
    import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { T } from '$lib/design-system/tokens.js';

    const address = $derived(avatarState.avatar?.address ?? '');
    const shortAddr = $derived(address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '');
    const displayName = $derived(avatarState.profile?.name ?? 'My Wallet');

    let copied = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyAddress() {
        if (!address) return;
        await navigator.clipboard.writeText(address);
        copied = true;
        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(() => { copied = false; }, 2000);
    }

    async function shareAddress() {
        if (!address) return;
        if (navigator.share) {
            await navigator.share({ title: 'My Circles address', text: address }).catch(() => {});
        } else {
            await copyAddress();
        }
    }
</script>

<div style="display:flex;flex-direction:column;gap:14px;padding-bottom:4px;">
    <!-- Light QR card -->
    <div style="
        background:{T.surface};border:1px solid {T.hairlineSoft};
        border-radius:22px;padding:24px;
        display:flex;flex-direction:column;align-items:center;gap:18px;
        box-shadow:{T.shadow.xs};
    ">
        <!-- Display name -->
        <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">
            {displayName}
        </span>

        <!-- QR -->
        <div style="display:inline-flex;">
            <QrCode value={address} />
        </div>

        <!-- Wallet address row -->
        <div style="
            width:100%;padding:12px 14px;border-radius:14px;
            background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};
            display:flex;align-items:center;gap:12px;
        ">
            <div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;">
                <span style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Wallet address</span>
                <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:540;">{shortAddr}</span>
            </div>
            <button
                type="button"
                onclick={copyAddress}
                aria-label={copied ? 'Address copied' : 'Copy address'}
                title={copied ? 'Copied!' : 'Copy address'}
                style="
                    width:44px;height:44px;border-radius:9999px;cursor:pointer;
                    background:{copied ? T.sageSoft : T.surface};
                    color:{copied ? T.positive : T.inkBody};
                    border:1px solid {copied ? T.sage : T.hairline};
                    display:inline-flex;align-items:center;justify-content:center;
                    flex-shrink:0;
                    transition:background .15s ease-out,color .15s ease-out,border-color .15s ease-out;
                "
            >
                <Icon name={copied ? 'check' : 'copy'} size={15} stroke={copied ? T.positive : T.inkBody} />
            </button>
            <button
                type="button"
                onclick={shareAddress}
                aria-label="Share address"
                title="Share address"
                style="
                    width:44px;height:44px;border-radius:9999px;cursor:pointer;
                    background:{T.surface};color:{T.inkBody};border:1px solid {T.hairline};
                    display:inline-flex;align-items:center;justify-content:center;
                    flex-shrink:0;
                "
            >
                <Icon name="share" size={15} stroke={T.inkBody} />
            </button>
        </div>
    </div>

    <!-- Trust-path info footer -->
    <div style="display:flex;align-items:flex-start;gap:8px;padding:0 2px;">
        <Icon name="info" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
        <span style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;">
            Receiving CRC requires a trust path. People without trust can still scan to <b style="color:{T.inkBody};">start one</b>.
        </span>
    </div>
</div>
