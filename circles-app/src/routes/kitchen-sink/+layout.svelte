<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  import { page } from '$app/stores';

  const navSections = [
    {
      title: 'Kitchen Sink (Golden)',
      items: [
        { href: '/kitchen-sink', label: 'Overview' },
        { href: '/kitchen-sink/golden', label: 'Golden Components & Layouts' },
        { href: '/kitchen-sink/popup-gallery', label: 'Popup Gallery' }
      ]
    },
    {
      title: 'Deprecated',
      items: [{ href: '/kitchen-sink/deprecated', label: 'Deprecated Showcase' }]
    }
  ];

  const pathname = $derived($page.url.pathname);
  const isActive = (href: string): boolean => pathname === href;
  const isPopupGalleryRoute = $derived(pathname === '/kitchen-sink/popup-gallery');
</script>

<div class={`py-4 space-y-4 ${isPopupGalleryRoute ? 'w-full px-4' : 'page page--lg'}`}>
  <div class="rounded-xl border border-base-300 bg-base-100 p-4">
    <h1 class="text-2xl font-semibold">Kitchen Sink</h1>
    <p class="text-sm opacity-70 mt-1">
      Golden flow/layout showcase plus a deprecated archive.
    </p>
    <div class="mt-4 space-y-3">
      {#each navSections as section (section.title)}
        <div class="space-y-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide opacity-60">{section.title}</h2>
          <nav class="flex flex-wrap gap-2">
            {#each section.items as item (item.href)}
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
      {/each}
    </div>
  </div>

  {@render children?.()}
</div>
