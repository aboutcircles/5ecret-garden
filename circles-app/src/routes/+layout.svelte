<script lang="ts" context="module">
    import {get, type Readable, writable} from "svelte/store";
    import {type ContactList} from "$lib/stores/contacts";
    import {popupControls} from "$lib/components/PopUp.svelte";
    import {type CirclesEventType} from "@circles-sdk/data";

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

    export async function ensureContacts(): Promise<Readable<{
        data: ContactList
        next: () => Promise<boolean>
        ended: boolean
    }>> {
        if (!get(avatar)) {
            throw new Error("Avatar store is not available");
        }
        if (!contacts) {
            contacts = createContacts();
            const c = get(contacts);
            await c.next();
        }
        return contacts;
    }

    export type Task<T> = {
        name: string;
        promise: Promise<T>
    };

    export const tasks = writable<Task<any>[]>([]);

    /**
     * Represents a task that waits for specified events or a timeout.
     * Implements the Task interface with a void return type.
     */
    export class WaitForEventTask implements Task<any> {
        name: string;
        promise: Promise<any>;

        constructor(events: Set<CirclesEventType>, timeout: number = 60) {
            this.name = `Waiting for ${Array.from(events).join(" | ")}`;
            this.promise = new Promise<void>((resolve) => {
                let handler: (() => void) | undefined = undefined;
                const a = get(avatar);

                const unsub = a?.events.subscribe((event) => {
                    if (!events.has(event.$event)) {
                        return;
                    }
                    handler?.();
                });

                const timeoutHandle = setTimeout(() => {
                    handler?.();
                    unsub?.();
                }, timeout * 1000);

                handler = () => {
                    clearTimeout(timeoutHandle);
                    resolve();
                    unsub?.();
                };
            });
        }
    }

    export function setLoadingUntilEvent(events: CirclesEventType[], timeout: number = 60) {
        const task = new WaitForEventTask(new Set(events), timeout);
        tasks.update((current) => [...current, task]);
        runTask(task)
            .finally(() => {
                tasks.update((current) => current.filter(t => t !== task));
            });
    }

    export async function runTask<T>(task: Task<T>): Promise<T> {
        tasks.update((current) => [...current, task]);
        try {
            return await task.promise;
        } finally {
            tasks.update((current) => current.filter(t => t !== task));
        }
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
    import Trust from "$lib/pages/AddContact.svelte";
    import Send from "$lib/flows/send/1_To.svelte";

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
                        title: "Send Circles",
                        component: Send,
                        props: {}
                    });
                }
            }];
        } else if ($page.route.id === "/_new/contacts") {
            quickActions = [{
                name: "Add Contact",
                link: "",
                icon: "/add-contact.svg",
                action: () => {
                    $popupControls.open?.({
                        title: "Add Contact",
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
                        title: "Send Circles",
                        component: Send,
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
<!--<div class="popup card">-->
<!--    <div class="pull-bar card-title b-12" >-->
<!--            <button class="w-12 h-24 bg-blue-100 cursor-pointer" on:click={() => {-->
<!--            }}>-->
<!--                <img src="/chevron-left.svg" class="w-6 h-6" />-->
<!--            </button>-->
<!--        Title-->
<!--    </div>-->
<!--    <div class="content mt-2">-->
<!--        <p>-->
<!--            Lorem ipsum dolor sit amet consectetur adipisicing elit. Nisi aliquam perspiciatis reprehenderit assumenda illo fuga dicta qui? Consequuntur expedita maxime, iure ad nemo architecto provident, odit fugit dolorum cupiditate quisquam.-->
<!--        </p>-->
<!--        <p>-->
<!--            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Necessitatibus ex molestias tempore est itaque exercitationem alias numquam et architecto eaque, iure nisi repellendus animi nam, veniam maxime deserunt temporibus ad.-->
<!--        </p>-->
<!--    </div>-->
<!--    &lt;!&ndash;    <div class="action-bar">&ndash;&gt;-->
<!--    &lt;!&ndash;        <button>&lt; Previous</button>&ndash;&gt;-->
<!--    &lt;!&ndash;        <button>Next &gt;</button>&ndash;&gt;-->
<!--    &lt;!&ndash;    </div>&ndash;&gt;-->
<!--</div>-->
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
                    link: "/_new/contacts"
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
{#if $tasks.length > 0}
    <div class="toast toast-bottom toast-end">
        {#each $tasks as task}
            <div class="alert">
                <span class="loading loading-spinner loading-md"></span> {task.name}
            </div>
        {/each}
    </div>
{/if}