<script lang="ts" context="module">
  import { get, readable, type Readable } from 'svelte/store';
  import { type ContactList } from '$lib/stores/contacts';
  import { popupControls } from '$lib/components/PopUp.svelte';

  export type QuickAction = {
    name: string;
    icon: string;
    action: () => void;
  };
</script>

<script lang="ts">
  import '../app.css';

  import DefaultHeader from '$lib/components/DefaultHeader.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { wallet } from '$lib/stores/wallet';
  import { canMigrate } from '$lib/guards/canMigrate';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import { page } from '$app/stores';
  import PopUp from '$lib/components/PopUp.svelte';
  import SearchAvatar from '$lib/flows/addContact/1_Search.svelte';
  import Send from '$lib/flows/send/1_To.svelte';
  import MintGroupTokens from '$lib/flows/mintGroupTokens/1_To.svelte';
  import { onMount } from 'svelte';
  import { tasks } from '$lib/utils/tasks';
  import { restoreWallet } from '$lib/utils/wallet';
  import { loadProfile, profile } from '$lib/stores/profile';

  let quickAction: QuickAction | undefined;

  const quickActionsMap: Record<string, QuickAction | undefined> = {
    '/dashboard': {
      name: 'Send',
      icon: '/send.svg',
      action: () => {
        $popupControls.open?.({
          title: 'Send Circles',
          component: Send,
          props: {},
        });
      },
    },
    '/contacts': {
      name: 'Add Contact',
      icon: '/add-contact.svg',
      action: () => {
        $popupControls.open?.({
          title: 'Add Contact',
          component: SearchAvatar,
          props: {},
        });
      },
    },
    '/groups': {
      name: 'Group mint',
      icon: '/banknotes-white.svg',
      action: () => {
        $popupControls.open?.({
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

  avatar.subscribe(async ($avatar) => {
    if ($avatar) {
      loadProfile($avatar);
    }
  });

  onMount(() => {
    restoreWallet();
  });

  $: quickAction = quickActionsMap[$page.route.id ?? ''] || undefined;

  let showPopUp = false;
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
  />
{:else}
  <DefaultHeader menuItems={[]} quickAction={undefined} route={''} />
{/if}

<main class="relative w-full h-full bg-white overflow-hidden font-dmSans">
  {#if $avatar && canMigrate($avatar.avatarInfo) && $page.route.id !== '/migrate-to-v2'}
    <UpdateBanner></UpdateBanner>
    <div class="h-20"></div>
  {/if}

  <div class="w-full flex flex-col items-center">
    <slot></slot>
  </div>

  <div
    role="button"
    tabindex="0"
    class={`fixed top-0 left-0 w-full h-full bg-black/50 z-10 ${showPopUp ? 'opacity-100' : 'opacity-0 hidden'} transition duration-300 ease-in-out`}
    on:mousedown={() => $popupControls.close?.call(undefined)}
    on:touchstart={() => $popupControls.close?.call(undefined)}
  ></div>
  <PopUp
    on:openingStart={() => {
      showPopUp = true;
    }}
    on:close={() => {
      showPopUp = false;
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
