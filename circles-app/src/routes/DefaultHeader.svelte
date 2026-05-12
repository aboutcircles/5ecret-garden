<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Search as LSearch } from 'lucide';
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
        // No catalog available in global header context
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

  // Close on route changes
  $effect(() => {
    // react to URL changes
    const _ = $page.url.pathname; // touch dependency
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

<div class="navbar bg-base-100 px-4 sticky top-0 z-10">
  <div class="flex-1">
    <a class="flex items-center text-xl font-bold" href={homeLink}>
      <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
      <span class="inline-block overflow-hidden text-primary">
        Circles
        <span class="ml-1 text-xs font-semibold text-base-content/60">(beta)</span>
      </span>
    </a>
  </div>
  {#if isMarketPage || $cartItemCount > 0}
    <button
      type="button"
      class="btn btn-sm btn-ghost mr-2"
      onclick={openBasket}
      disabled={$cartItemCount === 0}
    >
      Basket ({$cartItemCount})
    </button>
  {/if}
  <button
    type="button"
    class="btn btn-circle btn-ghost btn-sm mr-1"
    aria-label="Search"
    title="Search (Ctrl/Cmd+K)"
    onclick={onSearchButtonClick}
    onkeydown={onSearchButtonKeydown}
  >
    <Lucide icon={LSearch} size={16} ariaLabel="" />
  </button>
  <details class="dropdown dropdown-end flex-none" bind:this={menuEl}>
    <summary class="btn btn-circle btn-ghost btn-sm" aria-haspopup="menu" aria-expanded={menuEl?.open ? 'true' : 'false'}
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="inline-block h-5 w-5 stroke-current"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
        ></path>
      </svg></summary
    >
    <ul
      class="menu dropdown-content bg-base-100 rounded-box z-[1] w-64 p-2 shadow"
    >
      <li>
        <a class="link link-hover" href="/settings">Settings</a>
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
      <li>
        <a class="link link-hover" href="/privacy-policy">Privacy policy</a>
      </li>
      {#if dev}
        <li><a class="link link-hover" href="/kitchen-sink">Kitchen sink</a></li>
      {/if}
    </ul>
  </details>
</div>

