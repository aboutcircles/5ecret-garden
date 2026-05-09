<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  import { page } from '$app/stores';
  import { T } from '$lib/design-system/tokens';

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
  <div style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;">
    <h1 style="font-size:20px;font-weight:580;margin:0;">Kitchen Sink</h1>
    <p style="font-size:13px;color:{T.inkMuted};margin:4px 0 0 0;">
      Golden flow/layout showcase plus a deprecated archive.
    </p>
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
      {#each navSections as section (section.title)}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <h2 class="text-xs font-semibold uppercase tracking-wide opacity-60">{section.title}</h2>
          <nav style="display:flex;flex-wrap:wrap;gap:8px;">
            {#each section.items as item (item.href)}
              <a
                href={item.href}
                style={isActive(item.href)
                  ? `height:32px;padding:0 14px;border-radius:9999px;border:0;background:${T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none;`
                  : `height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:${T.inkMuted};font-size:12.5px;font-weight:580;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none;`}
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
