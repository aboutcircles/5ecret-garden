<script lang="ts">
  const ICONS: Record<string, string> = {
    wallet:       'M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm0 0V7a2 2 0 0 1 2-2h11l3 3M16 14h2',
    contacts:     'M16 18v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 9v-1a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75',
    groups:       'M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4M3 17l9 4 9-4',
    market:       'M5 8l1.5-3h11L19 8M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Zm4 4a3 3 0 0 0 6 0',
    send:         'M3 11l18-8-8 18-2-8-8-2Z',
    receive:      'M21 13l-9 8-9-8M12 21V3',
    search:       'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
    more:         'M5 12h.01M12 12h.01M19 12h.01',
    plus:         'M12 5v14M5 12h14',
    arrowRight:   'M5 12h14M13 5l7 7-7 7',
    arrowLeft:    'M19 12H5M11 5l-7 7 7 7',
    check:        'M5 13l4 4L19 7',
    copy:         'M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3M5 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z',
    external:     'M14 4h6v6M20 4 10 14M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6',
    qr:           'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h3v3h-3v-3Zm4 4h3v3h-3v-3Zm-4 0h3v-3h-3v3',
    trust:        'M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11h-4Z',
    sparkle:      'M12 3v6m0 6v6M3 12h6m6 0h6M6 6l4 4m4 4 4 4M6 18l4-4m4-4 4-4',
    filter:       'M4 5h16l-6 8v6l-4-2v-4L4 5Z',
    download:     'M12 3v13m0 0 4-4m-4 4-4-4M4 21h16',
    close:        'M6 6l12 12M18 6 6 18',
    chevronDown:  'M6 9l6 6 6-6',
    chevronRight: 'M9 6l6 6-6 6',
    scan:         'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10',
    bell:         'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M9 21a3 3 0 0 0 6 0',
    info:         'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.01M11 12h1v5h1',
    shield:       'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
    link:         'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    spark:        'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3',
    burger:       'M3 6h18M3 12h18M3 18h18',
    plant:        'M12 21V11M12 11C9 11 5 9 5 5c4 0 7 2 7 6Zm0 0c3 0 7-2 7-6-4 0-7 2-7 6Z',
    diamond:      'M2 9l4-6h12l4 6-10 13L2 9Zm0 0h20M8 3l4 6 4-6',
    flame:        'M12 22a7 7 0 0 0 7-7c0-4-3-5-3-9 0 0-2 1-3 4-1-3-4-5-7-3 1 4-1 5-1 8a7 7 0 0 0 7 7Z',
    verified:     'M12 2 14.5 4.5 18 4l1 3.5L22 9l-1.5 3L22 15l-3 1.5L18 20l-3.5-.5L12 22l-2.5-2.5L6 20l-1-3.5L2 15l1.5-3L2 9l3-1.5L6 4l3.5.5L12 2Zm-3 10 2 2 4-5',
    share:        'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14',
  };

  interface Props {
    name: string;
    size?: number;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    style?: string;
  }

  let { name, size = 18, stroke = 'currentColor', strokeWidth = 1.6, fill = 'none', style = '' }: Props = $props();
  const d = $derived(ICONS[name] ?? '');
</script>

{#if d}
<svg width={size} height={size} viewBox="0 0 24 24" {fill} stroke={stroke}
  stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" style={style}>
  <path d={d} />
</svg>
{/if}
