<script lang="ts">
  import SettingProfile from '$lib/pages/SettingProfile.svelte';
  import { environment } from '$lib/stores/environment.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { QuickAction } from '../../routes/+layout.svelte';

  interface Props {
    text?: string | undefined;
    address?: string | undefined;
    logo?: string | undefined;
    homeLink?: string;
    menuItems?: {
      name: string;
      link: string;
    }[];
    quickAction: QuickAction | undefined;
    route: string | null;
  }

  let {
    text = undefined,
    address = undefined,
    logo = undefined,
    homeLink = '/',
    menuItems = [],
    quickAction,
    route,
  }: Props = $props();
  let isDropdownOpen = $state(false);
</script>

<div
  class={`navbar font-dmSans ${environment.ring ? 'bg-secondary/80' : 'bg-white'} font-medium border-b fixed top-0 z-30 h-16 transition-color duration-300 ease-in-out ${
    isDropdownOpen ? 'shadow-lg' : ''
  }`}
>
  <div class="navbar-start pl-4">
    {#if menuItems.length > 0}
      <div class="dropdown">
        <button
          tabindex="0"
          class="btn btn-ghost btn-square lg:hidden -ml-4"
          onclick={() => (isDropdownOpen = true)}
          aria-label="Open menu"
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
            class="fixed -top-2 -left-6 dropdown-content transform-none w-screen h-screen bg-base-100 z-[100] py-2 pl-10 px-5 scale-100 font-medium"
          >
            <div class="flex flex-row justify-between items-center">
              <a class="flex items-center text-xl font-bold" href={homeLink}>
                <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
                <!-- TODO: Handle the sizing and ellipsis for the header text properly. This will do for now. -->
                <span class="inline-block overflow-hidden text-primary"
                  >Circles <p class="text-sm text-red-500">
                    {#if environment.ring}
                      (sandbox)
                    {:else}(beta){/if}
                  </p></span
                >
                <button
                  type="button"
                  class="btn btn-ghost btn-square flex rounded-lg p-0"
                  onclick={() => (isDropdownOpen = false)}
                  aria-label="Close menu"
                >
                  <img src="/close.svg" alt="Close" class="w-4 h-4" />
                </button>
              </a>
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
                onclick={(e) => {
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
    {/if}
    <a class="flex items-center text-xl font-bold" href={homeLink}>
      <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
      <!-- TODO: Handle the sizing and ellipsis for the header text properly. This will do for now. -->
      <span class="inline-block overflow-hidden text-primary"
        >Circles <p class="text-sm text-red-500">
          {#if environment.ring}
            (sandbox)
          {:else}(beta){/if}
        </p></span
      >
    </a>
    <ul class="menu menu-horizontal">
      <li>
        <details>
          <summary></summary>
          <ul class="bg-base-100 rounded-t-none p-2 w-40">
            <li>
              <a class="link link-hover" href="/terms">Terms of use</a>
            </li>
            <li>
              <a class="link link-hover" href="/privacy-policy"
                >Privacy policy</a
              >
            </li>
          </ul>
        </details>
      </li>
    </ul>
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
        onclick={(e) => {
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
        disabled={quickAction.action === undefined}
        onclick={() => {
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
