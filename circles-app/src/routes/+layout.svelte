<script lang="ts" context="module">
  export type QuickAction = {
    name: string;
    icon: string;
    action: () => void;
  };
</script>

<script lang="ts">
  import '../app.css';

  import DefaultHeader from '$lib/components/DefaultHeader.svelte';
  import { avatar, isGroup } from '$lib/stores/avatar';
  import { clearSession, restoreWallet, wallet } from '$lib/stores/wallet';
  import { canMigrate } from '$lib/guards/canMigrate';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import { page } from '$app/stores';
  import SearchAvatar from '$lib/flows/addContact/1_Search.svelte';
  import Send from '$lib/flows/send/1_To.svelte';
  import MintGroupTokens from '$lib/flows/mintGroupTokens/1_To.svelte';
  import { onMount } from 'svelte';
  import { tasks } from '$lib/utils/tasks';
  import type { Profile } from '@circles-sdk/profiles';
  import { getProfile } from '$lib/utils/profile';
  import { popupControls, popupState } from '$lib/stores/popUp';
  import PopUp from '$lib/components/PopUp.svelte';
  import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';

  let quickAction: QuickAction | undefined;

  let quickActionsMap: Record<string, QuickAction | undefined>;

  $: quickActionsMap = {
    '/dashboard': {
      name: 'Send',
      icon: '/send.svg',
      action: () => {
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
            component: SearchAvatar,
            props: {},
          });
        }
      },
    },
    '/groups': {
      name: 'Group mint',
      icon: '/banknotes-white.svg',
      action: () => {
        popupControls.open({
          title: 'Mint group tokens',
          component: MintGroupTokens,
          props: {},
        });
      },
    },
    '/register': {
      name: 'Disconnect',
      icon: '',
      action: () => {
        $wallet = undefined;
      },
    },
  };

  let profile: Profile;

  avatar.subscribe(async ($avatar) => {
    if ($avatar) {
      profile = await getProfile($avatar?.avatarInfo?.avatar ?? '');
    }
  });

  onMount(() => {
    if ($page.route.id === '/' || $page.route.id === '/connect-wallet') {
      clearSession();
    } else {
      restoreWallet();
    }
  });

  $: quickAction = quickActionsMap[$page.route.id ?? ''] || undefined;
</script>

{#if $avatar}
  <DefaultHeader
    text={profile?.name}
    address={$avatar.address}
    logo={profile?.previewImageUrl?.trim()
      ? profile.previewImageUrl
      : '/logo.svg'}
    homeLink="/dashboard"
    {quickAction}
    route={$page.route.id}
  />
{:else}
  <DefaultHeader menuItems={[]} quickAction={undefined} route={''} />
{/if}

<main class="relative w-full h-full bg-white overflow-hidden font-dmSans">
  {#if $avatar?.avatarInfo && canMigrate($avatar.avatarInfo) && $page.route.id !== '/migrate-to-v2'}
    <UpdateBanner />
    <div class="h-20"></div>
  {/if}

  <div class="w-full flex flex-col items-center">
    <slot></slot>
  </div>

  <div
    role="button"
    tabindex="0"
    class={`fixed top-0 left-0 w-full h-full bg-black/50 z-10 ${$popupState.content ? 'opacity-100' : 'opacity-0 hidden'} transition duration-300 ease-in-out`}
    on:mousedown={() => popupControls.close()}
    on:touchstart={() => popupControls.close()}
  />
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
