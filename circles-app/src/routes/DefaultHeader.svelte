<script lang="ts">
  import { onMount } from 'svelte';
  interface Props {
    homeLink?: string;
  }

  let { homeLink = '/' }: Props = $props();

  import { page } from '$app/stores';
  import { cartItemCount } from '$lib/cart/store';
  import { popupControls } from '$lib/stores/popup';
  import CartPanel from '$lib/flows/checkout/CartPanel.svelte';

  function openBasket(): void {
    popupControls.open({
      title: 'Basket',
      component: CartPanel,
      props: {
        // No catalog available in global header context
        catalog: [],
      },
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
    }
  }

  // Close on route changes
  $effect(() => {
    // react to URL changes
    const _ = $page.url.pathname; // touch dependency
    closeMenu();
  });

  onMount(() => {
    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeydown);
    return () => {
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
        <span class="ml-1 text-sm font-semibold text-red-800">(beta)</span>
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
      class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
    >
      <li><a class="link link-hover" href="/settings">Settings</a></li>
      <li><a class="link link-hover" href="/terms">Terms of use</a></li>
      <li>
        <a class="link link-hover" href="/privacy-policy">Privacy policy</a>
      </li>
    </ul>
  </details>
</div>
