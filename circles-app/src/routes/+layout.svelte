<script lang="ts" context="module">
    import {get, type Readable} from "svelte/store";
    import {type ContactList} from "$lib/stores/contacts";

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
    import Send from "$lib/dialogs/Send.svelte";
    import {createContacts} from "$lib/stores/contacts";
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
                    sendModal.showModal();
                }
            }];
        } else if ($page.route.id === "/_new/trust-relations") {
            quickActions = [{
                name: "Add Contact",
                link: "",
                icon: "/add-contact.svg",
                action: () => {
                    trustModal.showModal();
                }
            }];
        } else if ($page.route.id === "/_new/dashboard/balances") {
            quickActions = [{
                name: "Send",
                link: "",
                icon: "/send.svg",
                action: () => {
                    sendModal.showModal();
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

</script>
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
        <Send></Send>
        <Trust></Trust>
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