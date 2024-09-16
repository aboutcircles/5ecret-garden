<script lang="ts" context="module">
    import {get, type Readable} from "svelte/store";
    import {type ContactList} from "$lib/stores/contacts";
    import {popupControls} from "$lib/components/PopUp.svelte";

    export type QuickAction = {
        name: string;
        link: string;
        icon: string;
        action: () => void;
    }

    export let contacts: Readable<{
        data: ContactList
        next: () => Promise<boolean>
        ended: boolean
    }> | undefined = undefined;

    export function ensureContacts() {
        if (!get(avatar)) {
            throw new Error("Avatar store is not available");
        }
        if (!contacts) {
            contacts = createContacts();
        }
        return contacts;
    }
</script>
<script lang="ts">
    import "../app.css";

    import DefaultHeader from "$lib/components/DefaultHeader.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {wallet} from "$lib/stores/wallet";
    import {canMigrate} from "$lib/guards/canMigrate";
    import UpdateBanner from "$lib/components/UpdateBanner.svelte";
    import {page} from "$app/stores";
    import {createContacts} from "$lib/stores/contacts";
    import PopUp from "$lib/components/PopUp.svelte";
    import SendFlow from "$lib/flows/SendFlow.svelte";
    import Trust from "$lib/dialogs/Trust.svelte";

    async function getProfile() {
        if ($avatar?.avatarInfo?.version === 2) {
            return await $avatar.getProfile();
        } else if ($avatar?.avatarInfo?.version === 1) {
            return Promise.resolve({
                previewImageUrl: "/logo.svg",
                name: $avatar.address
            });
        } else {
            throw new Error(`Unknown avatar version: ${$avatar?.avatarInfo?.version}`);
        }
    }

    let quickActions: QuickAction[] = [];
    $: {
        if ($page.route.id === "/_new/dashboard") {
            quickActions = [{
                name: "Send",
                link: "",
                icon: "/send.svg",
                action: () => {
                    $popupControls.open?.({
                        component: SendFlow,
                        props: {}
                    });
                }
            }];
        } else if ($page.route.id === "/_new/trust-relations") {
            quickActions = [{
                name: "Add Contact",
                link: "",
                icon: "/add-contact.svg",
                action: () => {
                    $popupControls.open?.({
                        component: Trust,
                        props: {}
                    });
                }
            }];
        } else if ($page.route.id === "/_new/dashboard/balances") {
            quickActions = [{
                name: "Send",
                link: "",
                icon: "/send.svg",
                action: () => {
                    $popupControls.open?.({
                        component: SendFlow,
                        props: {}
                    });
                }
            }];
        } else {
            quickActions = [];
        }
    }

    $: {
        if ($avatar) {
            contacts = createContacts();
        }
    }

    let showPopUp = false;
    let overlayOpacity = 0;

</script>
<style>
    .baseLayer {
        position: relative;
        width: 100%;
        height: 100%;
        background-color: white;
        overflow: hidden;
    }

    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1;
    }
</style>
{#if $avatar}
    {#await getProfile()}
        <DefaultHeader menuItems={[]} quickActions={[]}/>
    {:then profile}
        <DefaultHeader
                text={profile?.name ?? $avatar.address}
                logo={(profile?.previewImageUrl ?? "").trim() === "" ? "/logo.svg" : profile?.previewImageUrl}
                homeLink="/_new/dashboard"
                menuItems={[{
                    name: "Dashboard",
                    link: "/_new/dashboard"
                }, {
                    name: "Contacts",
                    link: "/_new/trust-relations"
                }, {
                    name: "Groups",
                    link: "/_new/groups"
                }, {
                    name: "Settings",
                    link: "/settings"
                }]}
                quickActions={quickActions}
        />
    {:catch error}
        <DefaultHeader menuItems={[]} quickActions={[]}/>
    {/await}
{:else if $wallet}
    <DefaultHeader menuItems={[]} quickActions={[{
        name: "Disconnect " + ($wallet?.address?.toString().substring(0,12) ?? "") + "..." ?? "",
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

<main class="baseLayer">
    {#if $avatar && canMigrate($avatar.avatarInfo) && $page.route.id !== "/migrate-to-v2"}
        <UpdateBanner></UpdateBanner>
    {/if}

    <slot></slot>

    {#if showPopUp}
        <div class="overlay" style="opacity: {overlayOpacity}"
             on:mousedown={ () => $popupControls.close?.call(undefined) }
             on:touchstart={ () => $popupControls.close?.call(undefined) }>
        </div>
    {/if}
    <PopUp on:openingStart={() => {
                showPopUp = true;
            }}
           on:close={() =>{
                console.log("close");
                showPopUp = false;
           }}
           on:overlayOpacity={(event) => {
                overlayOpacity = event.detail.opacity;
           }}/>
</main>