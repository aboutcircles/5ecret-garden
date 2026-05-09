<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Search as LSearch, ShoppingBag as LBag } from 'lucide';
  interface Props {
    homeLink?: string;
  }

  let { homeLink = '/' }: Props = $props();

  import { page } from '$app/stores';
  import { openFlowPopup, popupControls, popupState } from '$lib/shared/state/popup';
  import { writable, type Unsubscriber } from 'svelte/store';
  import GlobalAvatarSearchPopup from '$lib/shared/ui/avatar-search/GlobalAvatarSearchPopup.svelte';

  const cartItemCount = writable(0);
  let cartCountUnsub: Unsubscriber | null = null;

  async function ensureCartCountSubscription(): Promise<void> {
    if (cartCountUnsub) return;
    const { cartItemCount: cartItemCountStore } = await import('$lib/areas/market/cart/store');
    cartCountUnsub = cartItemCountStore.subscribe((value) => {
      cartItemCount.set(value);
    });
  }

  async function openBasket(): Promise<void> {
    const [{ default: CartPanel }, { cartItemCount: cartItemCountStore }] = await Promise.all([
      import('$lib/areas/market/flows/checkout/CartPanel.svelte'),
      import('$lib/areas/market/cart/store'),
    ]);

    if (!cartCountUnsub) {
      cartCountUnsub = cartItemCountStore.subscribe((value) => {
        cartItemCount.set(value);
      });
    }

    openFlowPopup({
      title: 'Basket',
      component: CartPanel,
      props: {
        catalog: [],
      },
    });
  }

  function openGlobalSearch(): void {
    popupControls.open({
      title: 'Search',
      kind: 'inspect',
      dismiss: 'backdrop',
      component: GlobalAvatarSearchPopup,
    });
  }

  const isMarketPage = $derived($page.url.pathname.startsWith('/market'));

  let menuEl: HTMLDetailsElement | null = $state(null);

  function closeMenu(focusTrigger = false) {
    if (menuEl && menuEl.open) {
      menuEl.open = false;
      if (focusTrigger) {
        const summary = menuEl.querySelector('summary') as HTMLElement | null;
        summary?.focus();
      }
    }
  }

  function handleDocClick(event: MouseEvent) {
    if (menuEl && menuEl.open) {
      const target = event.target as Node | null;
      if (target && !menuEl.contains(target)) {
        closeMenu();
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeMenu(true);
      return;
    }

    const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (!isOpenShortcut) return;

    if ($popupState.content) return;
    const target = event.target as HTMLElement | null;
    const isTypingContext = !!target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
    if (isTypingContext) return;

    event.preventDefault();
    openGlobalSearch();
  }

  function onSearchButtonClick(): void {
    openGlobalSearch();
    closeMenu();
  }

  function onSearchButtonKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSearchButtonClick();
  }

  $effect(() => {
    const _ = $page.url.pathname;
    closeMenu();
  });

  onMount(() => {
    void ensureCartCountSubscription();
    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      cartCountUnsub?.();
      cartCountUnsub = null;
      document.removeEventListener('click', handleDocClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<!-- Mobile-only clean header; desktop uses AppSidebar -->
<header class="md:hidden sticky top-0 z-20 flex items-center h-14 px-[18px] gap-1.5 shrink-0"
  style="background:#F6F5F2;">

  <!-- Logo -->
  <a href={homeLink} class="flex items-center gap-2 flex-1 no-underline">
    <img src="/logo.svg" alt="Circles" class="w-[22px] h-[22px]" />
    <span class="font-semibold text-[15px] tracking-tight" style="color:#0F0A1E;">Circles</span>
    <span class="text-[10px] px-1.5 py-0.5 rounded-full font-[580] tracking-wider lowercase"
      style="background:#EFEDE7;color:rgba(15,10,30,0.40);">beta</span>
  </a>

  <!-- Cart (market page or has items) -->
  {#if isMarketPage || $cartItemCount > 0}
    <button
      type="button"
      class="relative cursor-pointer flex items-center justify-center"
      onclick={openBasket}
      disabled={$cartItemCount === 0}
      aria-label="Open basket"
      style="width:36px;height:36px;border-radius:9999px;background:#FFFFFF;border:1px solid rgba(31,17,70,0.08);box-shadow:0 1px 2px rgba(15,10,30,0.04);"
    >
      <Lucide icon={LBag} size={16} ariaLabel="" />
      {#if $cartItemCount > 0}
        <span style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:9999px;background:#5849D4;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;">
          {$cartItemCount}
        </span>
      {/if}
    </button>
  {/if}

  <!-- Search -->
  <button
    type="button"
    class="cursor-pointer flex items-center justify-center"
    aria-label="Search (Ctrl/Cmd+K)"
    onclick={onSearchButtonClick}
    onkeydown={onSearchButtonKeydown}
    style="width:36px;height:36px;border-radius:9999px;background:#FFFFFF;border:1px solid rgba(31,17,70,0.08);box-shadow:0 1px 2px rgba(15,10,30,0.04);"
  >
    <Lucide icon={LSearch} size={16} ariaLabel="" />
  </button>

  <!-- Hamburger menu -->
  <details class="dropdown dropdown-end flex-none" bind:this={menuEl}>
    <summary
      class="flex items-center justify-center list-none cursor-pointer"
      aria-haspopup="menu"
      aria-expanded={menuEl?.open ? 'true' : 'false'}
      style="width:36px;height:36px;border-radius:9999px;background:#FFFFFF;border:1px solid rgba(31,17,70,0.08);box-shadow:0 1px 2px rgba(15,10,30,0.04);"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        class="inline-block w-4 h-4 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
          d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </summary>
    <ul class="menu dropdown-content bg-base-100 z-[1] w-64 p-2 mt-1"
      style="border-radius:14px;box-shadow:0 4px 24px rgba(15,10,30,0.12);border:1px solid rgba(31,17,70,0.08);">
      <li>
        <a class="link link-hover rounded-lg" href="/settings">Settings</a>
        <ul>
          <li><a class="link link-hover" href="/settings?tab=personal">Profile</a></li>
          <li><a class="link link-hover" href="/settings?tab=bookmarks">Bookmarks</a></li>
          <li><a class="link link-hover" href="/settings?tab=orders">Orders</a></li>
          <li><a class="link link-hover" href="/settings?tab=sales">Sales</a></li>
          <li><a class="link link-hover" href="/settings?tab=marketplace">Offers</a></li>
          <li><a class="link link-hover" href="/settings?tab=payment">Payment gateways</a></li>
          <li><a class="link link-hover" href="/settings?tab=namespaces">Namespaces</a></li>
          <li><a class="link link-hover" href="/settings?tab=keys">Signing keys</a></li>
        </ul>
      </li>
      <li><a class="link link-hover" href="/terms">Terms of use</a></li>
      <li><a class="link link-hover" href="/privacy-policy">Privacy policy</a></li>
      {#if dev}
        <li><a class="link link-hover" href="/kitchen-sink">Kitchen sink</a></li>
      {/if}
    </ul>
  </details>
</header>
