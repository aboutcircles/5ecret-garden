<script lang="ts">
    import "../app.css";

    import AvatarInfoHeader from "$lib/components/AccountInfoHeader.svelte";
    import DefaultHeader from "$lib/components/DefaultHeader.svelte";
    import {avatar} from "$lib/stores/avatar";
    import Footer from "$lib/components/Footer.svelte";
</script>

{#if $avatar}
    <AvatarInfoHeader/>
{:else}
    <DefaultHeader/>
{/if}

<main class="p-4">
    <slot></slot>
</main>

{#if $avatar}
    <Footer />
{/if}