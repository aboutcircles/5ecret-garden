<script lang="ts">
    import "../app.css";

    import AvatarInfoHeader from "$lib/components/AccountInfoHeader.svelte";
    import DefaultHeader from "$lib/components/DefaultHeader.svelte";
    import {avatar} from "$lib/stores/avatar";
    import Footer from "$lib/components/Footer.svelte";
    import {canMigrate} from "$lib/guards/canMigrate";
    import UpdateBanner from "$lib/components/UpdateBanner.svelte";
    import {page} from "$app/stores";
</script>
{#if $avatar}
    <AvatarInfoHeader/>
{:else}
    <DefaultHeader/>
{/if}

<main class="p-4">
    {#if $avatar && canMigrate($avatar.avatarInfo) && $page.route.id !== "/migrate-to-v2"}
        <UpdateBanner></UpdateBanner>
    {/if}
    <slot></slot>
</main>

{#if $avatar}
    <div class="mt-12">
        <Footer />
    </div>
{/if}