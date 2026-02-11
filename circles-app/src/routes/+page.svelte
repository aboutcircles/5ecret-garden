<script lang="ts">
    import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
    import { openFlowPopup } from '$lib/shared/state/popup';

    async function connectWallet() {
        const { default: SelectWallet } = await import('$lib/areas/wallet/ui/onboarding/SelectWallet.svelte');

        openFlowPopup({
            component: SelectWallet,
            title: 'Select Wallet',
        });
    }
</script>


<div class="page page-stack page--lg">
    <div class="min-h-screen flex flex-col items-center justify-center text-center">
        <picture>
            <source
                type="image/webp"
                srcset="/illustration-340.webp 340w, /illustration-680.webp 680w"
                sizes="(max-width: 640px) 340px, 340px"
            />
            <img
                src="/illustration-340.png"
                srcset="/illustration-340.png 340w, /illustration-680.png 680w"
                sizes="(max-width: 640px) 340px, 340px"
                alt="illustration"
                width="340"
                height="340"
                class="max-w-[340px]"
                loading="eager"
                fetchpriority="high"
            />
        </picture>
        <h1 class="text-5xl font-medium">Money, Reimagined</h1>
        <p class="py-6 px-2 max-w-2xl">
            Mint personal Circles, build trust, and manage your community groups with the Circles Core app
        </p>
        <ActionButton action={connectWallet}>Connect Wallet</ActionButton>
    </div>
</div>
