<script lang="ts">
    import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';

    const address = $derived(avatarState.avatar?.address ?? '');

    let copied = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyAddress() {
        if (!address) return;
        await navigator.clipboard.writeText(address);
        copied = true;
        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(() => { copied = false; }, 2000);
    }
</script>

<div class="flex flex-col items-center gap-4 pt-2 pb-1">
    <div class="rounded-[16px] bg-base-200 p-5 flex items-center justify-center">
        <QrCode value={address} />
    </div>

    <button
        type="button"
        class="w-full font-mono text-xs text-center break-all px-4 py-3 rounded-[12px] transition-colors cursor-pointer border"
        style={copied
            ? 'background:#DCEBDF;border-color:#DCEBDF;color:#2D8A52;'
            : 'background:var(--color-base-200,#F6F5F2);border-color:rgba(15,10,30,0.08);color:rgba(15,10,30,0.70);'}
        onclick={copyAddress}
        title="Copy address"
    >
        {#if copied}
            ✓ Copied!
        {:else}
            {address}
        {/if}
    </button>

    <p class="text-xs text-center" style="color:rgba(15,10,30,0.45);">
        Share this address or QR code to receive CRC
    </p>
</div>
