<script lang="ts">
    import "../app.css";

    import DefaultHeader from "$lib/components/DefaultHeader.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {wallet} from "$lib/stores/wallet";
    import {canMigrate} from "$lib/guards/canMigrate";
    import UpdateBanner from "$lib/components/UpdateBanner.svelte";
    import {page} from "$app/stores";
</script>
{#if $avatar}
    {#await $avatar.getProfile()}
        <DefaultHeader menuItems={[]} quickActions={[]}/>
    {:then profile}
        <DefaultHeader text={profile?.name ?? $avatar.address} menuItems={[{
            name: "Dashboard",
            link: "/_new/dashboard"
        }, {
            name: "Contacts",
            link: "/contacts"
        }, {
            name: "Groups",
            link: "/groups"
        }, {
            name: "Settings",
            link: "/settings"
        }]} quickActions={[]}/>
    {:catch error}
        <DefaultHeader menuItems={[]} quickActions={[]}/>
    {/await}

<!--    <AvatarInfoHeader/>-->
{:else if $wallet}
    <DefaultHeader menuItems={[]} quickActions={[{
        name: "Disconnect " + $wallet.address?.toString().substring(0,12) + "..." ?? "",
        link: "/_new/connect-wallet",
        icon: "/disconnect.svg",
        action: () => {
            $wallet = undefined;
        }
    }]}/>
{:else if $page.route.id?.startsWith("/_new/connect-wallet")}
    <DefaultHeader menuItems={[]} quickActions={[]}/>
{:else}
    <DefaultHeader menuItems={[]} quickActions={[{
        name: "Connect",
        link: "/_new/connect-wallet",
        icon: "/connect.svg",
        action: undefined
    }]}/>
{/if}

<main>
    {#if $avatar && canMigrate($avatar.avatarInfo) && $page.route.id !== "/migrate-to-v2"}
        <UpdateBanner></UpdateBanner>
    {/if}
    <slot></slot>
</main>

<!--{#if $avatar}-->
<!--    <div class="mt-12">-->
<!--        <Footer/>-->
<!--    </div>-->
<!--{/if}-->