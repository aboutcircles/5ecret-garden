<script lang="ts" context="module">
  import { get, type Readable, writable } from 'svelte/store';
  import { type ContactList } from '$lib/stores/contacts';
  import { popupControls } from '$lib/components/PopUp.svelte';

  export type QuickAction = {
    name: string;
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
</script>

<script lang="ts">
  import '../app.css';

  import DefaultHeader from '$lib/components/DefaultHeader.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { wallet } from '$lib/stores/wallet';
  import { canMigrate } from '$lib/guards/canMigrate';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import { page } from '$app/stores';
  import { createContacts } from '$lib/stores/contacts';
  import PopUp from '$lib/components/PopUp.svelte';
  import SearchAvatar from '$lib/flows/addContact/1_Search.svelte';
  import Send from '$lib/flows/send/1_To.svelte';
  import { getProfile } from '$lib/components/Avatar.svelte';
  import MintGroupTokens from '$lib/flows/mintGroupTokens/1_To.svelte';
  import { onMount } from 'svelte';
  import { tasks } from '$lib/utils/tasks';

  onMount(() => {
    const savedWallet = localStorage.getItem('wallet');
    console.log(savedWallet);
  });

  async function getOwnProfile() {
    if (!$avatar) {
      throw new Error('Avatar store is not available');
    }
    return await getProfile($avatar.address);
  }

  let quickAction: QuickAction | undefined;

  const quickActionsMap: Record<string, QuickAction | undefined> = {
    '/dashboard': {
      name: 'Send',
      icon: '/send.svg',
      action: () => {
        $popupControls.open?.({
          title: 'Send Circles',
          component: Send,
          props: { allowAssetSelection: false },
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

  $: {
    quickAction = quickActionsMap[$page.route.id ?? ''] || undefined;
  }

  $: {
    if ($avatar) {
      contacts = createContacts();
    }
  }

  let showPopUp = false;
  let overlayOpacity = 0;
</script>

{#if $avatar}
  {#await getOwnProfile()}
    <DefaultHeader menuItems={[]} quickAction={undefined} route={''} />
  {:then profile}
    <DefaultHeader
      text={profile?.name ?? $avatar.address}
      address={$avatar.address}
      logo={(profile?.previewImageUrl ?? '').trim() === ''
        ? '/logo.svg'
        : profile?.previewImageUrl}
      homeLink="/dashboard"
      {quickAction}
      route={$page.route.id}
    />
  {/await}
{:else}
  <DefaultHeader menuItems={[]} quickAction={undefined} route={''} />
{/if}

<main class="baseLayer font-dmSans">
  {#if $avatar && canMigrate($avatar.avatarInfo) && $page.route.id !== '/migrate-to-v2'}
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
