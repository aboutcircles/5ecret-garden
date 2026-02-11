<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  import { page } from '$app/stores';

  const navItems = [
    { href: '/kitchen-sink', label: 'Overview' },
    { href: '/kitchen-sink/state-feedback', label: 'State & Feedback' },
    { href: '/kitchen-sink/layout-shell', label: 'Layout & Shell' },
    { href: '/kitchen-sink/flows-domain', label: 'Flows & Domain' },
    { href: '/kitchen-sink/data-types', label: 'Data & Types' },
    { href: '/kitchen-sink/tabs', label: 'Tabs' },
    { href: '/kitchen-sink/actions', label: 'Actions' },
    { href: '/kitchen-sink/identity', label: 'Identity & Utility' },
    { href: '/kitchen-sink/markdown', label: 'Markdown' },
    { href: '/kitchen-sink/lists', label: 'Lists & Loading' },
    { href: '/kitchen-sink/list-search-role-model', label: 'List/Search Role Model' },
    { href: '/kitchen-sink/misc', label: 'Misc' }
  ];

  const pathname = $derived($page.url.pathname);
  const isActive = (href: string): boolean => pathname === href;
</script>

<div class="page page--lg py-4 space-y-4">
  <div class="rounded-xl border border-base-300 bg-base-100 p-4">
    <h1 class="text-2xl font-semibold">Kitchen Sink</h1>
    <p class="text-sm opacity-70 mt-1">
      Component playground split by category.
    </p>
    <nav class="mt-4 flex flex-wrap gap-2">
      {#each navItems as item (item.href)}
        <a
          href={item.href}
          class={`btn btn-sm ${isActive(item.href) ? 'btn-primary' : 'btn-ghost'}`}
          aria-current={isActive(item.href) ? 'page' : undefined}
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>

  {@render children?.()}
</div>
