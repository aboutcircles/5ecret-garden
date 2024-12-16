<script lang="ts" context="module">
    import {get, type Readable, writable} from 'svelte/store';
    import {type ContactList} from '$lib/stores/contacts';
    import {popupControls} from '$lib/components/PopUp.svelte';
    import {type CirclesEventType} from '@circles-sdk/data';
    import ErrorPage from '$lib/pages/Error.svelte';
    import {circles} from "$lib/stores/circles";

    export type QuickAction = {
        name: string;
        link: string;
        icon: string;
        action: () => void;
    };

    export let contacts:
        | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
    }>
        | undefined = undefined;

    export async function ensureContacts(): Promise<
        Readable<{
            data: ContactList;
            next: () => Promise<boolean>;
            ended: boolean;
        }>
    > {
        if (!get(avatar)) {
            throw new Error('Avatar store is not available');
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
        promise: Promise<T>;
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
            this.name = `Waiting for ${Array.from(events).join(' | ')}`;
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

    export function setLoadingUntilEvent(
        events: CirclesEventType[],
        timeout: number = 60
    ) {
        const task = new WaitForEventTask(new Set(events), timeout);
        tasks.update((current) => [...current, task]);
        runTask(task).finally(() => {
            tasks.update((current) => current.filter((t) => t !== task));
        });
    }

    export async function runTask<T>(task: Task<T>): Promise<T> {
        tasks.update((current) => [...current, task]);
        e: Error;
        try {
            return await task.promise;
        } catch (e) {
            console.log(`Task errored: ${task.name}`, e);
            get(popupControls).open?.({
                title: 'Error',
                component: ErrorPage,
                props: {
                    errorMessage: e.message,
                    stackTrace: e.stack,
                },
            });
        } finally {
            tasks.update((current) => current.filter((t) => t !== task));
        }
        throw new Error('Task failed');
    }
</script>

<script lang="ts">
    import '../app.css';

    import DefaultHeader from '$lib/components/DefaultHeader.svelte';
    import {avatar} from '$lib/stores/avatar';
    import {wallet} from '$lib/stores/wallet';
    import UpdateBanner from '$lib/components/UpdateBanner.svelte';
    import {page} from '$app/stores';
    import {createContacts} from '$lib/stores/contacts';
    import PopUp from '$lib/components/PopUp.svelte';
    import SearchAvatar from '$lib/flows/addContact/1_Search.svelte';
    import Send from '$lib/flows/send/1_To.svelte';
    import {getProfile} from '$lib/components/Avatar.svelte';
    import MintGroupTokens from '$lib/flows/mintGroupTokens/1_To.svelte';

    async function getOwnProfile() {
        if (!$avatar) {
            throw new Error('Avatar store is not available');
        }
        return await getProfile($avatar.address);
    }

    let quickActions: QuickAction[] = [];
    let activePage: string;
    $: {
        if ($page.route.id === '/_new/dashboard') {
            quickActions = [
                {
                    name: 'Send',
                    link: '',
                    icon: '/send.svg',
                    action: () => {
                        $popupControls.open?.({
                            title: 'Send Circles',
                            component: Send,
                            props: {
                                allowAssetSelection: false,
                            },
                        });
                    },
                },
            ];
            activePage = 'Dashboard';
        } else if ($page.route.id === '/_new/contacts') {
            quickActions = [
                {
                    name: 'Add Contact',
                    link: '',
                    icon: '/add-contact.svg',
                    action: () => {
                        $popupControls.open?.({
                            title: 'Add Contact',
                            component: SearchAvatar,
                            props: {},
                        });
                    },
                },
            ];
            activePage = 'Contacts';
        } else if ($page.route.id === '/_new/dashboard/balances') {
            quickActions = [
                {
                    name: 'Send',
                    link: '',
                    icon: '/send.svg',
                    action: () => {
                        $popupControls.open?.({
                            title: 'Send Circles',
                            component: Send,
                            props: {},
                        });
                    },
                },
            ];
        } else if ($page.route.id === '/_new/groups') {
            quickActions = [
                {
                    name: 'Group mint',
                    link: '',
                    icon: '/banknotes-white.svg',
                    action: () => {
                        $popupControls.open?.({
                            title: 'Mint group tokens',
                            component: MintGroupTokens,
                            props: {},
                        });
                    },
                },
            ];
            activePage = 'Groups';
        } else if ($page.route.id === '/settings') {
            activePage = 'Settings';
            quickActions = [];
        } else if ($page.route.id === '/_new/tools') {
            activePage = 'Tools';
        } else {
            quickActions = [];
        }
    }

    let canSelfMigrate = false;

    $: {
        if ($avatar) {
            contacts = createContacts();
            $circles.canSelfMigrate($avatar.avatarInfo)
                .then(r => canSelfMigrate = r);
        }
    }

    let showPopUp = false;
    let overlayOpacity = 0;
</script>

{#if $avatar}
    {#await getOwnProfile()}
        <DefaultHeader menuItems={[]} quickActions={[]}/>
    {:then profile}
        <DefaultHeader
                text={profile?.name ?? $avatar.address}
                address={$avatar.address}
                logo={(profile?.previewImageUrl ?? '').trim() === ''
        ? '/logo.svg'
        : profile?.previewImageUrl}
                homeLink="/_new/dashboard"
                menuItems={[
        {
          name: 'Dashboard',
          link: '/_new/dashboard',
        },
        {
          name: 'Contacts',
          link: '/_new/contacts',
        },
        {
          name: 'Groups',
          link: '/_new/groups',
        },
        {
          name: 'Settings',
          link: '/settings',
        },
        // {
        //   name: 'Tools',
        //   link: '/_new/tools',
        // },
      ]}
                {quickActions}
                {activePage}
        />
    {:catch error}
        <DefaultHeader menuItems={[]} quickActions={[]}/>
    {/await}
{:else if $wallet}
    <DefaultHeader
            menuItems={[]}
            quickActions={[
      {
        name: 'Disconnect',
        link: '/_new/connect-wallet',
        action: () => {
          $wallet = undefined;
        },
      },
    ]}
    />
{:else}
    <DefaultHeader menuItems={[]} quickActions={[]}/>
{/if}

<main class="baseLayer font-dmSans">
    {#if canSelfMigrate && $page.route.id !== '/migrate-to-v2'}
        <UpdateBanner></UpdateBanner>
        <div class="h-20"></div>
    {/if}

    <div class="w-full flex flex-col items-center">
        <slot></slot>
    </div>

    {#if showPopUp}
        <div
                class="overlay"
                style="opacity: {overlayOpacity}"
                on:mousedown={() => $popupControls.close?.call(undefined)}
                on:touchstart={() => $popupControls.close?.call(undefined)}
        ></div>
    {/if}
    <PopUp
            on:openingStart={() => {
      showPopUp = true;
    }}
            on:close={() => {
      // console.log('close');
      showPopUp = false;
    }}
            on:overlayOpacity={(event) => {
      overlayOpacity = event.detail.opacity;
    }}
    />
</main>
{#if $tasks.length > 0}
    <div class="toast toast-bottom toast-end">
        {#each $tasks as task}
            {#if task.name == 'Error'}
                <div class="alert alert-error">
                    {#await task.promise}
                        <span class="loading loading-spinner loading-md"></span>
                    {:then error}
                        <p>{error.message}</p>
                        <pre>{error.stackTrace}</pre>
                    {/await}
                </div>
            {:else}
                <div class="alert">
                    <span class="loading loading-spinner loading-md"></span>
                    {task.name}
                </div>
            {/if}
        {/each}
    </div>
{/if}

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
