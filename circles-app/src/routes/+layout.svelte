<script lang="ts" module>
    export type QuickAction = {
        name: string;
        icon: string;
        action?: () => void | undefined;
    };
</script>

<script lang="ts">
    import '../app.css';

    import DefaultHeader from '$lib/components/DefaultHeader.svelte';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import {
        clearSession,
        restoreSession,
        signer,
    } from '$lib/stores/wallet.svelte';
    import { canMigrate } from '$lib/guards/canMigrate';
    import UpdateBanner from '$lib/components/UpdateBanner.svelte';
    import { page } from '$app/stores';
    import Send from '$lib/flows/send/1_To.svelte';
    import { onDestroy, onMount } from 'svelte';
    import { tasks } from '$lib/utils/tasks';
    import { popupControls, popupState } from '$lib/stores/popUp';
    import PopUp from '$lib/components/PopUp.svelte';
    import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';
    import { getProfile } from '$lib/utils/profile';
    import { initTransactionHistoryStore } from '$lib/stores/transactionHistory';
    import { initContactStore } from '$lib/stores/contacts';
    import { initBalanceStore } from '$lib/stores/circlesBalances';
    import { browser } from '$app/environment';
    import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
    import { initGroupMetricsStore } from '$lib/stores/groupMetrics.svelte';
    import { circles } from '$lib/stores/circles';
    import Footer from '$lib/components/Footer.svelte';

    import { watchAccount } from '@wagmi/core';
    import { config } from '../config';
    import WrongNetwork from '$lib/components/WrongNetwork.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';

    const unwatch = watchAccount(config, {
        onChange(account) {
            //handler for injected wallet
            if (signer.privateKey === undefined) {
                //if the account is not on the correct network, show the wrong network popup
                if (account.chainId !== 100 && account.address) {
                    popupControls.open({
                        title: 'Wrong Network',
                        component: WrongNetwork,
                        props: {},
                    });
                }
                //if the account is not the same as the signer, clear the session
                if (
                    signer.address &&
                    account.address &&
                    account.address.toLowerCase() !== signer.address.toLowerCase()
                ) {
                    clearSession();
                }
            }
        },
    });

    onDestroy(() => {
        unwatch();
    });

    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    let quickActionsMap: Record<string, QuickAction | undefined> = $derived({
        '/dashboard': {
            name: 'Send',
            icon: '/send.svg',
            action: avatarState.isGroup
                ? undefined
                : () => {
                    popupControls.open({
                        title: 'Send Circles',
                        component: Send,
                        props: {},
                    });
                },
        },
        '/contacts': {
            name: avatarState.isGroup ? 'Manage members' : 'Add Contact',
            icon: '/add-contact.svg',
            action: () => {
                if (avatarState.isGroup) {
                    popupControls.open({
                        title: 'Manage members',
                        component: ManageGroupMembers,
                        props: {},
                    });
                } else {
                    popupControls.open({
                        title: 'Add Contact',
                        component: ManageGroupMembers,
                        props: {},
                    });
                }
            },
        },
        '/groups': {
            name: 'Send',
            icon: '/send.svg',
            action: avatarState.isGroup
                ? undefined
                : () => {
                    popupControls.open({
                        title: 'Send Circles',
                        component: Send,
                        props: {},
                    });
                },
        },
        '/register': {
            name: 'Disconnect',
            icon: '',
            action: () => {
                clearSession();
            },
        },
        '/settings': {
            name: 'Disconnect',
            icon: '',
            action: () => {
                clearSession();
            },
        },
    });
    let menuItems: { name: string; link: string }[] = $state([]);

    let quickAction: QuickAction | undefined = $derived(
        quickActionsMap[$page.route.id ?? ''] || undefined
    );

    onMount(async () => {
        if (
            $page.route.id !== '/' &&
            $page.route.id !== '/connect-wallet/connect-safe' &&
            $page.route.id !== '/connect-wallet/import-circles-garden'
        ) {
            await restoreSession();
        }
    });

    $effect(() => {
        if (avatarState.avatar) {
            menuItems = [
                { name: 'Dashboard', link: '/dashboard' },
                { name: 'Contacts', link: '/contacts' },
                ...(!avatarState.isGroup ? [{ name: 'Groups', link: '/groups' }] : []),
                { name: 'Settings', link: '/settings' },
            ];
        }
    });

    // init profile state
    $effect(() => {
        const address = avatarState.avatar?.address;
        if (address) {
            getProfile(address).then((newProfile) => {
                avatarState.profile = newProfile;
            });
        } else {
            avatarState.profile = undefined;
        }
    });

    // init stores
    $effect(() => {
        if (avatarState.avatar) {
            initTransactionHistoryStore(avatarState.avatar);
            initContactStore(avatarState.avatar);
            initBalanceStore(avatarState.avatar);
            if (avatarState.groupType === 'CrcV2_BaseGroupCreated' && $circles) {
                initGroupMetricsStore($circles.circlesRpc, avatarState.avatar.address);
            }
        }
    });
</script>

{#if avatarState.avatar}
    <div class="relative z-[60]">
        <DefaultHeader
                text={avatarState.profile?.name}
                address={avatarState.avatar.address}
                logo={avatarState.profile?.previewImageUrl?.trim()
      ? avatarState.profile.previewImageUrl
      : '/logo.svg'}
                homeLink="/dashboard"
                {quickAction}
                route={$page.route.id}
                {menuItems}
        />
    </div>
{:else}
    <div class="relative z-[60]">
        <DefaultHeader quickAction={undefined} route={''} />
    </div>
{/if}

<svelte:head>
    {#if browser && PUBLIC_PLAUSIBLE_DOMAIN}
        <script
                defer
                data-domain={PUBLIC_PLAUSIBLE_DOMAIN}
                src="https://plausible.io/js/script.js"
        ></script>
    {/if}
</svelte:head>

<main class="relative w-full min-h-screen bg-base-200 border-gray-200 overflow-hidden font-dmSans pb-20">
    {#if avatarState.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo) && $page.route.id !== '/migrate-to-v2'}
        <UpdateBanner />
        <div class="h-20"></div>
    {/if}

    <!-- stretch page children so inner containers can use full content width -->
    <div class="w-full flex flex-col items-stretch">
        {@render children?.()}
    </div>

    {#if avatarState.avatar}
        <BottomNav items={menuItems} />
    {/if}

    <div
            role="button"
            tabindex="0"
            class={`fixed top-0 left-0 w-full h-full bg-black/50 z-10 ${$popupState.content ? 'opacity-100' : 'opacity-0 hidden'} transition duration-300 ease-in-out`}
            onmousedown={() => popupControls.close()}
            ontouchstart={() => popupControls.close()}
    ></div>
    <PopUp />
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
