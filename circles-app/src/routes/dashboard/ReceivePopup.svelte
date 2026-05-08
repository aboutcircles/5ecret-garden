<script lang="ts">
    import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { T } from '$lib/design-system/tokens.js';

    const address = $derived(avatarState.avatar?.address ?? '');
    const shortAddr = $derived(address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '');

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

<div style="display:flex;flex-direction:column;gap:16px;padding-bottom:4px;">
    <!-- Dark ink QR card -->
    <div style="
        background:{T.ink};color:{T.butter};border-radius:22px;padding:28px 24px 24px;
        display:flex;flex-direction:column;align-items:center;gap:18px;
    ">
        <!-- QR Code -->
        <div style="background:#fff;border-radius:14px;padding:16px;display:inline-flex;">
            <QrCode value={address} />
        </div>

        <!-- Name + address -->
        <div style="display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;">
            <span style="font-family:{T.fontDisplay};font-size:22px;letter-spacing:-0.01em;">
                {avatarState.profile?.name ?? 'My Wallet'}
            </span>
            <span style="font-family:{T.fontMono};font-size:11.5px;opacity:0.6;">{shortAddr}</span>
        </div>
    </div>

    <!-- Request a specific amount row -->
    <div style="
        padding:14px 16px;border-radius:14px;
        background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};
        display:flex;align-items:center;gap:12px;cursor:pointer;
    ">
        <div style="width:32px;height:32px;border-radius:9px;background:{T.primarySoft};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <Icon name="sparkle" size={15} stroke={T.primary} strokeWidth={2} />
        </div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:580;color:{T.ink};">Request a specific amount</div>
            <div style="font-size:11.5px;color:{T.inkMuted};margin-top:1px;">Generates a payment link with amount</div>
        </div>
        <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
    </div>

    <!-- Copy / Share buttons -->
    <div style="display:flex;align-items:center;gap:8px;">
        <button
            type="button"
            onclick={copyAddress}
            style="
                flex:1;height:44px;border-radius:9999px;cursor:pointer;
                background:{copied ? T.sageSoft : T.surface};
                color:{copied ? T.positive : T.ink};
                border:1px solid {copied ? T.sage : T.hairline};
                display:inline-flex;align-items:center;justify-content:center;gap:8px;
                font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                box-shadow:{T.shadow.xs};
                transition:background .15s,color .15s,border-color .15s;
            "
        >
            <Icon name={copied ? 'check' : 'copy'} size={15} stroke={copied ? T.positive : T.inkBody} />
            {copied ? 'Copied!' : 'Copy address'}
        </button>
        <button
            type="button"
            onclick={shareAddress}
            style="
                flex:1;height:44px;border-radius:9999px;cursor:pointer;
                background:{T.primary};color:#fff;border:0;
                display:inline-flex;align-items:center;justify-content:center;gap:8px;
                font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;
            "
        >
            <Icon name="share" size={15} stroke="#fff" />
            Share
        </button>
    </div>

    <!-- Info footnote -->
    <div style="display:flex;align-items:flex-start;gap:8px;padding:0 2px;">
        <Icon name="info" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
        <span style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;">
            Receiving CRC requires a trust path. People without trust can still scan to <b style="color:{T.inkBody};">start one</b>.
        </span>
    </div>
</div>
