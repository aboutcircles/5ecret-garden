<script lang="ts">
  import SettingProfile from '$lib/pages/SettingProfile.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { QuickAction } from '../../routes/+layout.svelte';

  export let text: string | undefined = undefined;
  export let address: string | undefined = undefined;
  export let logo: string | undefined = undefined;

  export let homeLink = '/';

  export let menuItems = [
    { name: 'Dashboard', link: '/dashboard' },
    { name: 'Contacts', link: '/contacts' },
    { name: 'Groups', link: '/groups' },
    { name: 'Settings', link: '/settings' },
  ];

  export let quickAction: QuickAction | undefined;

  export let route: string | null;
  let isDropdownOpen = false;
</script>

<div
  class="navbar font-dmSans bg-white font-medium border-b fixed top-0 z-30 h-16"
>
  <div class="navbar-start gap-4">
    <div class="dropdown">
      <button
        tabindex="0"
        class="btn btn-ghost btn-square lg:hidden"
        on:click={() => (isDropdownOpen = true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h8m-8 6h16"
          />
        </svg>
      </button>
      {#if isDropdownOpen}
        <div
          class="fixed -top-2 -left-2 dropdown-content transform-none w-screen h-screen bg-base-100 z-[100] py-2 px-5 scale-100 font-medium"
        >
          <div class="flex flex-row justify-between items-center">
            <a class="flex items-center text-xl font-bold" href={homeLink}>
              <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
              <!-- TODO: Handle the sizing and ellipsis for the header text properly. This will do for now. -->
              <span class="inline-block overflow-hidden text-primary"
                >Circles <p class="text-sm text-red-500">(beta)</p></span
              >
            </a>
            <button
              type="button"
              class="btn btn-ghost btn-square flex rounded-lg p-2"
              on:click={() => (isDropdownOpen = false)}
            >
              <img src="/close.svg" alt="Close" class="w-4 h-4" />
            </button>
          </div>
          <ul class="text-xl py-4">
            {#each menuItems as item}
              <li class="py-3">
                <a
                  class={`${item.link === route ? 'text-primary' : ''}`}
                  tabindex="0"
                  href={item.link}>{item.name}</a
                >
              </li>
            {/each}
          </ul>
          {#if text}
            <button
              class="flex items-center hover:scale-105 transition-transform duration-300"
              on:click={(e) => {
                isDropdownOpen = false;
                popupControls.open({
                  component: SettingProfile,
                  title: '',
                  props: {
                    address: address,
                  },
                });
                e.preventDefault();
                return true;
              }}
            >
              <div class="bg-black/10 rounded-full mr-2 h-7 w-7">
                {#if logo}
                  <img
                    src={logo}
                    alt="Avatar"
                    class="h-full w-full rounded-full"
                  />
                {/if}
              </div>
              <p class="mr-3 text-xl">{text}</p>
            </button>
          {/if}
        </div>
      {/if}
    </div>
    <a class="flex items-center text-xl font-bold" href={homeLink}>
      <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
      <!-- TODO: Handle the sizing and ellipsis for the header text properly. This will do for now. -->
      <span class="inline-block overflow-hidden text-primary"
        >Circles <p class="text-sm text-red-500">(beta)</p></span
      >
    </a>
  </div>
  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal px-1">
      {#each menuItems as item}
        <li>
          <a
            class={item.link === route
              ? 'font-bold text-primary'
              : 'font-medium'}
            href={item.link}>{item.name}</a
          >
        </li>
      {/each}
    </ul>
  </div>
  <div class="navbar-end gap-4">
    {#if text}
      <button
        class="hidden md:flex items-center hover:scale-105 transition-transform duration-300"
        on:click={(e) => {
          popupControls.open({
            component: SettingProfile,
            title: '',
            props: {
              address: address,
            },
          });
          e.preventDefault();
          return true;
        }}
      >
        <div class="bg-black/10 rounded-full mr-2 h-7 w-7">
          {#if logo}
            <img src={logo} alt="Avatar" class="h-full w-full rounded-full" />
          {/if}
        </div>
        <p class="mr-3 font-medium">{text}</p>
      </button>
    {/if}
    {#if quickAction}
      <button
        class="btn btn-primary text-white"
        on:click={() => {
          if (quickAction.action) {
            quickAction.action();
          }
        }}
      >
        {#if quickAction.icon}
          <img
            class="h-3.5 w-3.5"
            src={quickAction.icon}
            alt={quickAction.name}
          />
        {/if}
        {quickAction.name}
      </button>
    {/if}
  </div>
</div>
