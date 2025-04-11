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
  import { avatar, isGroup } from '$lib/stores/avatar';
  import { clearSession, restoreWallet } from '$lib/stores/wallet';
  import { canMigrate } from '$lib/guards/canMigrate';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import { page } from '$app/stores';
  import Send from '$lib/flows/send/1_To.svelte';
  import { onMount } from 'svelte';
  import { tasks } from '$lib/utils/tasks';
  import { profile } from '$lib/stores/profile';
  import { popupControls, popupState } from '$lib/stores/popUp';
  import PopUp from '$lib/components/PopUp.svelte';
  import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let quickActionsMap: Record<string, QuickAction | undefined> = $derived({
    '/dashboard': {
      name: 'Send',
      icon: '/send.svg',
      action: $isGroup
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
      name: $isGroup ? 'Manage members' : 'Add Contact',
      icon: '/add-contact.svg',
      action: () => {
        if ($isGroup) {
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
      action: $isGroup
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
    if ($page.route.id === '/' || $page.route.id === '/connect-wallet') {
      await clearSession();
    } else {
      await restoreWallet();
    }
  });

  $effect(() => {
    if ($avatar) {
      menuItems = [
        { name: 'Dashboard', link: '/dashboard' },
        { name: 'Contacts', link: '/contacts' },
        ...(!$isGroup ? [{ name: 'Groups', link: '/groups' }] : []),
        { name: 'Settings', link: '/settings' },
      ];
    }
  });
</script>

{#if $avatar}
  <DefaultHeader
    text={$profile?.name}
    address={$avatar.address}
    logo={$profile?.previewImageUrl?.trim()
      ? $profile.previewImageUrl
      : '/logo.svg'}
    homeLink="/dashboard"
    {quickAction}
    route={$page.route.id}
    {menuItems}
  />
{:else}
  <DefaultHeader quickAction={undefined} route={''} />
{/if}

<main class="relative w-full h-full bg-white overflow-hidden font-dmSans">
  {#if $avatar?.avatarInfo && canMigrate($avatar.avatarInfo) && $page.route.id !== '/migrate-to-v2'}
    <UpdateBanner />
    <div class="h-20"></div>
  {/if}

  <div class="w-full flex flex-col items-center p-4 md:p-0">
    {@render children?.()}
  </div>

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
