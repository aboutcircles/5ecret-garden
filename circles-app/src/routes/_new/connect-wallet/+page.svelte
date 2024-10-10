<script lang="ts">

    import {onMount} from "svelte";

    let hasBrowserWallet = false;
    onMount(() => {
        hasBrowserWallet = typeof (<any>window).ethereum !== 'undefined';
    });
</script>
<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row">

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <img src="/logo.svg"
                     alt="Shoes"
                     class="w-16 h-16 rounded-xl"/>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Import account</h2>
                <p>Use your circles.garden key in 5eecret-garden</p>
                {#if hasBrowserWallet}
                    <div class="card-actions">
                        <a href="/_new/connect-wallet/import-circles-garden" class="btn btn-primary">Connect</a>
                    </div>
                {:else}
                    <div class="card-actions">
                        <a href="/_new/connect-wallet" class="btn btn-disabled">Not available</a>
                    </div>
                {/if}
            </div>
        </div>

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <img src="/fox.png"
                     alt="Shoes"
                     class="w-16 h-16 rounded-xl"/>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Use MetaMask</h2>
                <p>Use Circles with MetaMask or any compatible browser wallet</p>
                {#if hasBrowserWallet}
                    <div class="card-actions">
                        <a href="/_new/connect-wallet/connect-metamask" class="btn btn-primary">Connect</a>
                    </div>
                {:else}
                    <div class="card-actions">
                        <a href="/_new/connect-wallet" class="btn btn-disabled">Not available</a>
                    </div>
                {/if}
            </div>
        </div>

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <img src="/safe.svg"
                     alt="Shoes"
                     class="w-16 h-16 rounded-xl"/>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Use Safe</h2>
                <p>Use Circles with Safe and MetaMask or any compatible browser wallet</p>
                {#if hasBrowserWallet}
                    <div class="card-actions">
                        <a href="/_new/connect-wallet/connect-safe" class="btn btn-primary">Connect</a>
                    </div>
                {:else}
                    <div class="card-actions">
                        <a href="/_new/connect-wallet" class="btn btn-disabled">Not available</a>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row">
        <div class="collapse w-96">
            <input type="checkbox" checked/>
            <div class="collapse-title text-xl text-center font-medium w-full">Testnet only options</div>
            <div class="collapse-content">
                <div class="card bg-base-100 w-96 shadow-xl">
                    <figure class="px-10 pt-10">
                        <img src="/cometh-logo.svg"
                             alt="Shoes"
                             class="w-16 h-16 rounded-xl"/>
                    </figure>
                    <div class="card-body items-center text-center">
                        <h2 class="card-title">Use Cometh</h2>
                        <p>Use Circles with a Passkey that's stored on your device</p>
                        <div class="card-actions">
                            <a href="/_new/connect-wallet/connect-cometh" class="btn btn-primary">Connect</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>