<script lang="ts">
    import ActionButton from '$lib/components/ActionButton.svelte';
    import {popupControls} from '$lib/stores/popup';
    import SelectWallet from '$lib/components/SelectWallet.svelte';

    async function connectWallet() {
        popupControls.open({
            component: SelectWallet,
            title: 'Select Wallet',
            props: {},
        });
    }
</script>


<div class="page page-stack page--lg">
    <div class="min-h-screen flex flex-col items-center justify-center text-center">
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
        <h1 class="text-5xl font-medium">Money, Reimagined</h1>
        <p class="py-6 px-2 max-w-2xl">
            Mint personal Circles, build trust, and manage your community groups with the Circles Core app
        </p>
        <ActionButton action={connectWallet}>Connect Wallet</ActionButton>
    </div>
</div>
