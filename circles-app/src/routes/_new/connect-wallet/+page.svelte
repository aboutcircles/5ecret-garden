<script lang="ts">
    import {circles} from "$lib/stores/circles";
    import {onMount} from "svelte";

    onMount(async () => {
    });
</script>
<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row-reverse">

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

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <img src="/fox.png"
                     alt="Shoes"
                     class="w-16 h-16 rounded-xl"/>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Use MetaMask</h2>
                <p>Use Circles with MetaMask or any compatible browser wallet</p>
                <div class="card-actions">
                    <a href="/_new/connect-wallet/connect-metamask" class="btn btn-primary">Connect</a>
                </div>
            </div>
        </div>
    </div>
</div>