<script lang="ts">
  import SettingProfile from '$lib/pages/SettingProfile.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import HomeIcon from './icons/HomeIcon.svelte';
  import AddressBookIcon from './icons/AddressBookIcon.svelte';
  import UserGroupIcon from './icons/UserGroupIcon.svelte';
  import SettingsIcon from './icons/SettingsIcon.svelte';
  import LogoutIcon from './icons/LogoutIcon.svelte';

  interface Props {
    text?: string | undefined;
    address?: string | undefined;
    logo?: string | undefined;
    homeLink?: string;
    menuItems?: {
      name: string;
      link: string;
    }[];
    route: string | null;
  }

  let {
    text = undefined,
    address = undefined,
    logo = undefined,
    homeLink = '/',
    menuItems = [],
    route,
  }: Props = $props();
  let isDropdownOpen = $state(false);
</script>

<!-- Modern Header with Horizontal Navigation -->
<div
  class={`w-full font-dmSans ${settings.ring ? 'bg-secondary/80' : 'bg-white'} border-b fixed top-0 z-30 h-16 transition-colors duration-300 ease-in-out ${
    isDropdownOpen ? 'shadow-lg' : 'shadow-sm'
  }`}
>
  <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
    <!-- Left: Logo -->
    <div class="flex items-center">
      <a class="flex items-center space-x-2" href={homeLink}>
        <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
        <span class="text-xl font-bold text-primary">
          Circles
          <span class="text-xs text-red-500 ml-1">
            {#if settings.ring}(sandbox){:else}(beta){/if}
          </span>
        </span>
      </a>
    </div>

    <!-- Center: Navigation (Desktop) -->
    <div class="hidden md:flex items-center space-x-2">
      {#each menuItems as item}
        {@const isActive = item.link === route}
        <a
          href={item.link}
          class={`flex items-center space-x-3 px-3 py-3 rounded-circles-button transition-colors duration-200 ${
            isActive 
              ? 'text-circles-orange font-medium bg-circles-card' 
              : 'text-circles-text-muted hover:text-circles-text hover:bg-gray-50'
          }`}
        >
          {#if item.name === 'Dashboard' || item.name === 'Home'}
            <HomeIcon class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
          {:else if item.name === 'Contacts'}
            <AddressBookIcon class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
          {:else if item.name === 'Groups'}
            <UserGroupIcon class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
          {:else if item.name === 'Settings'}
            <SettingsIcon class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
          {/if}
          <span class="font-medium">{item.name}</span>
        </a>
      {/each}
    </div>

    <!-- Right: User Profile & Quick Action -->
    <div class="flex items-center space-x-4">
      <!-- User Profile (Desktop) -->
      {#if text}
        <button
          class="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          onclick={(e) => {
            popupControls.open({
              component: SettingProfile,
              title: '',
              props: {
                address: address,
              },
            });
            e.preventDefault();
          }}
        >
          <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
            {#if logo}
              <img src={logo} alt="Avatar" class="w-full h-full object-cover" />
            {:else}
              <div class="w-full h-full bg-primary/20 flex items-center justify-center">
                <span class="text-primary font-semibold text-sm">
                  {text.charAt(0).toUpperCase()}
                </span>
              </div>
            {/if}
          </div>
          <span class="font-medium text-gray-700 max-w-24 truncate">{text}</span>
        </button>
      {/if}


      <!-- Mobile Menu Button -->
      {#if menuItems.length > 0}
        <button
          class="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          onclick={() => (isDropdownOpen = !isDropdownOpen)}
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Mobile Navigation Overlay -->
  {#if isDropdownOpen}
    <div class="md:hidden fixed inset-0 top-16 bg-white z-50 border-t">
      <div class="p-4 space-y-2">
        {#each menuItems as item}
          {@const isActive = item.link === route}
          <a
            href={item.link}
            class={`flex items-center space-x-3 px-4 py-3 rounded-circles-button transition-colors duration-200 ${
              isActive 
                ? 'text-circles-orange font-medium bg-circles-card' 
                : 'text-circles-text-muted hover:text-circles-text hover:bg-gray-50'
            }`}
            onclick={() => (isDropdownOpen = false)}
          >
            {#if item.name === 'Dashboard' || item.name === 'Home'}
              <HomeIcon size="lg" class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
            {:else if item.name === 'Contacts'}
              <AddressBookIcon size="lg" class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
            {:else if item.name === 'Groups'}
              <UserGroupIcon size="lg" class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
            {:else if item.name === 'Settings'}
              <SettingsIcon size="lg" class={isActive ? 'text-circles-orange' : 'text-circles-text-muted'} />
            {/if}
            <span class="font-medium">{item.name}</span>
          </a>
        {/each}

        <!-- Mobile User Profile -->
        {#if text}
          <button
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 mt-4 border-t pt-4"
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
            }}
          >
            <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {#if logo}
                <img src={logo} alt="Avatar" class="w-full h-full object-cover" />
              {:else}
                <div class="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span class="text-primary font-semibold">
                    {text.charAt(0).toUpperCase()}
                  </span>
                </div>
              {/if}
            </div>
            <div class="text-left">
              <div class="font-medium text-gray-700">{text}</div>
              <div class="text-sm text-gray-500">View Profile</div>
            </div>
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
