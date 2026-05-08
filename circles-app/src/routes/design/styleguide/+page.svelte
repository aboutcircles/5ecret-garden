<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
  import Avatar from '$lib/design-system/Avatar.svelte';
  import AvatarStack from '$lib/design-system/AvatarStack.svelte';
  import Button from '$lib/design-system/Button.svelte';
  import Pill from '$lib/design-system/Pill.svelte';
  import Tabs from '$lib/design-system/Tabs.svelte';
  import Card from '$lib/design-system/Card.svelte';
  import Money from '$lib/design-system/Money.svelte';
  import CirclesLogo from '$lib/design-system/CirclesLogo.svelte';
  import { CirclesData } from '$lib/design-system/data.js';

  function note(kind: 'info' | 'do' | 'dont' | 'warn', text: string): string {
    const map = {
      info: { bg: T.primaryFaint, fg: T.primaryDeep, icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v1m0 4v5' },
      do:   { bg: T.sageSoft,     fg: '#1F5E37',     icon: 'M5 12l5 5L20 7' },
      dont: { bg: T.coralSoft,    fg: '#8A3A1E',     icon: 'M18 6L6 18M6 6l12 12' },
      warn: { bg: T.butterSoft,   fg: '#7B5215',     icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v1m0 4v5' },
    }[kind];
    return `<div style="padding:12px 14px;border-radius:12px;background:${map.bg};display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:${T.inkBody};line-height:1.55;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${map.fg}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="${map.icon}"/></svg><div>${text}</div></div>`;
  }

  const MAXW = 980;
  const PAD = 64;

  const colorGroups = [
    { title: 'Surfaces', items: [
      ['page',        T.page,        'Default app background. Warmer than near-white.',        false],
      ['pageDeep',    T.pageDeep,    'Recessed wells, segmented controls, kbd chips.',          false],
      ['surface',     T.surface,     'Cards, modals, drawers. The lifted layer.',               false],
      ['surfaceAlt',  T.surfaceAlt,  'Subtle nested surface within a card.',                    false],
    ]},
    { title: 'Ink', items: [
      ['ink',         T.ink,         'Headings, primary numbers, button labels (on light).',    true],
      ['inkBody',     T.inkBody,     'Body copy, list items, secondary text.',                  true],
      ['inkMuted',    T.inkMuted,    'Captions, helper text, label rows.',                      false],
      ['inkSubtle',   T.inkSubtle,   'Placeholder, separator labels.',                          false],
      ['inkFaint',    T.inkFaint,    'Disabled, decorative dividers.',                          false],
    ]},
    { title: 'Brand · Circles purple', items: [
      ['primary',      T.primary,      'Primary buttons, focus, active nav. The brand.',        true],
      ['primaryHover', T.primaryHover, 'Hover state for primary surfaces.',                     true],
      ['primaryDeep',  T.primaryDeep,  'Pill text on lilac, deep emphasis.',                    true],
      ['primarySoft',  T.primarySoft,  'Pill backgrounds, active nav surface.',                 false],
      ['primaryFaint', T.primaryFaint, 'Hover surfaces, very subtle wash.',                     false],
    ]},
    { title: 'Accents · use sparingly, mostly in illustration & data', items: [
      ['coral',      T.coral,      'Warm illustration color. Sent-money dot.',                  true],
      ['coralSoft',  T.coralSoft,  'Pill bg, hero gradients.',                                  false],
      ['butter',     T.butter,     'Mint/warning highlights. QR fg on ink card.',               true],
      ['butterSoft', T.butterSoft, 'Mint nudge backgrounds.',                                   false],
      ['sage',       T.sage,       'Positive trust, "mutual" pill foreground.',                 true],
      ['sageSoft',   T.sageSoft,   'Positive surfaces.',                                        false],
      ['rose',       T.rose,       'Seasonal accent. Use rarely.',                              true],
      ['roseSoft',   T.roseSoft,   'Soft rose surfaces.',                                       false],
      ['lilac',      T.lilac,      'Group color. Decorative.',                                  true],
      ['lilacSoft',  T.lilacSoft,  'Lilac wash for groups.',                                    false],
    ]},
    { title: 'Semantic', items: [
      ['positive', T.positive, 'Received money, success, confirmed.', true],
      ['negative', T.negative, 'Sent money, errors, destructive.',    true],
      ['warning',  T.warning,  'Caution states.',                      true],
    ]},
  ] as const;

  const typeScale = [
    { label: 'Display · Hero',    size: 84, family: T.fontDisplay, text: '146.91',                                                   spec: 'fontDisplay · 84 · -0.03em',     weight: 400,  ls: '-0.03em' },
    { label: 'Display · Section', size: 56, family: T.fontDisplay, text: 'What Circles feels like',                                  spec: 'fontDisplay · 56 · -0.025em',    weight: 400,  ls: '-0.025em' },
    { label: 'Display · Card',    size: 32, family: T.fontDisplay, text: 'Berlin Mutual Aid',                                        spec: 'fontDisplay · 32 · -0.02em',     weight: 400,  ls: '-0.02em' },
    { label: 'Display · Inline',  size: 22, family: T.fontDisplay, text: 'shorn.circles.eth',                                        spec: 'fontDisplay · 22 · -0.02em',     weight: 400,  ls: '-0.02em' },
    { label: 'Body · Lede',       size: 16, family: T.fontSans,    text: 'Send Circles to anyone in your trust network.',            spec: 'fontSans · 16 · 1.55 lh',        weight: 500,  color: T.ink },
    { label: 'Body · Default',    size: 14, family: T.fontSans,    text: 'Replaces the recipient-only screen in the current app.',   spec: 'fontSans · 14 · 1.5 lh',         weight: 500,  color: T.ink },
    { label: 'Body · Compact',    size: 13, family: T.fontSans,    text: 'Mutual trust · last sent 2 hours ago.',                    spec: 'fontSans · 13 · 1.45 lh',        weight: 540,  color: T.ink },
    { label: 'Caption',           size: 11.5, family: T.fontSans,  text: '247 trust connections · 4 degrees',                        spec: 'fontSans · 11.5 · inkMuted',     weight: 400,  color: T.inkMuted },
    { label: 'Eyebrow',           size: 11, family: T.fontSans,    text: 'TOTAL BALANCE',                                            spec: 'fontSans · 11 · 0.06em · 580w',  weight: 600,  color: T.inkMuted, ls: '0.06em', upper: true },
    { label: 'Mono · address',    size: 12, family: T.fontMono,    text: '0xc175…FdEe91',                                            spec: 'fontMono · 12',                  weight: 400,  color: T.ink },
  ];

  const spacingScale = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 48, 64];

  const brandPillars = [
    { word: 'Warm',      desc: 'Cream + lavender + coral. Never grayscale-only.' },
    { word: 'Quiet',     desc: 'Soft hairlines (4–8% ink). No heavy borders.' },
    { word: 'Editorial', desc: 'Display serif for moments. Sans for everything else.' },
    { word: 'Honest',    desc: 'Show real values, real names, real numbers.' },
    { word: 'Generous',  desc: 'Whitespace is the brand. Don\'t pack it in.' },
    { word: 'Human',     desc: 'Lowercase ok. Specific verbs. Skip the corp gloss.' },
  ];

  const openWork = [
    'Onboarding flow (3-step: connect → handle → first trust)',
    'Empty states for each main screen',
    'Group detail page',
    'Settings (network, theme, security, notifications)',
    'Polish layer (hover/active states, focus rings, skeletons, toasts)',
    'Auth + signing screens',
  ];

  const tocItems = [
    ['01', 'Brand & voice',                   'brand'],
    ['02', 'Color tokens',                     'color'],
    ['03', 'Typography',                       'type'],
    ['04', 'Layout — spacing, radii, shadows', 'layout'],
    ['05', 'Components',                       'components'],
    ['06', 'Composition patterns',             'compositions'],
    ['07', 'Iconography',                      'icons'],
    ['08', 'Motion',                           'motion'],
    ['09', 'Copy & numbers',                   'copy'],
    ['10', 'Worked example',                   'example'],
    ['11', 'Engineering handoff',              'handoff'],
  ];

  const allIcons = ['wallet','contacts','groups','market','send','receive','search','plus','arrowRight','arrowLeft','check','copy','external','qr','trust','sparkle','filter','download','close','chevronDown','chevronRight','scan','bell','info','shield','link','flame','verified','share'];

  const fileMap = [
    ['tokens.ts',                'Single source of truth for all design tokens. Import as `T`.'],
    ['data.ts',                  'Realistic mock data — me, contacts, groups, activity, offers.'],
    ['Icon.svelte',              'Stroke icon set — 35+ paths, 24×24 viewBox.'],
    ['Avatar.svelte',            'Seeded gradient avatar. Kinds: gradient, token, group.'],
    ['AvatarStack.svelte',       'Overlapping avatar row from an array of seeds.'],
    ['Button.svelte',            '5 variants × 3 sizes, icon left/right, full-width.'],
    ['Pill.svelte',              '10 color variants. Accepts string color for data-driven use.'],
    ['Tabs.svelte',              'Pill-shaped segmented control with optional count badges.'],
    ['Card.svelte',              'Lifted surface card with configurable padding.'],
    ['Money.svelte',             'Tabular-nums CRC formatter. Signed + color-coded.'],
    ['Row.svelte',               'Flex row: gap, align, justify, wrap.'],
    ['Stack.svelte',             'Flex column: gap.'],
    ['CirclesLogo.svelte',       'Half-disc glyph + "Circles" wordmark.'],
    ['FakeQR.svelte',            'Seeded decorative QR — deterministic per address.'],
    ['Scrim.svelte',             'Absolute-fill dark overlay with backdrop blur.'],
    ['MobileSheet.svelte',       'Bottom sheet with drag handle. Sits above Scrim.'],
    ['DesktopDrawer.svelte',     'Right-aligned 480px panel with title bar + close.'],
    ['Sidebar.svelte',           'Desktop sidebar: logo, nav, account, mint nudge.'],
    ['TopBar.svelte',            'Desktop header: eyebrow, title, ⌘K, bell, QR.'],
    ['AppShell.svelte',          '1440×900 shell: Sidebar + scrollable main area.'],
    ['MobileShell.svelte',       'Mobile container with 47px status bar + optional tab bar.'],
    ['MobileHeader.svelte',      'Mobile page header with leading/trailing snippets.'],
    ['MobileTabBar.svelte',      '5-tab bottom bar with center FAB (Send).'],
  ];
</script>

<svelte:head>
  <title>Circles Core — Style Guide</title>
</svelte:head>

<div style="background:{T.page};min-height:100vh;padding-bottom:120px;font-family:{T.fontSans};color:{T.inkBody};">

  <!-- Cover -->
  <section style="max-width:{MAXW}px;margin:0 auto;padding:120px 28px 24px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <CirclesLogo size={32} />
      <Pill color="lilac">Style Guide · v1</Pill>
    </div>
    <h1 style="margin:24px 0 0;font-family:{T.fontDisplay};font-size:96px;font-weight:400;color:{T.ink};letter-spacing:-0.035em;line-height:0.95;">
      The Circles<br/>design system
    </h1>
    <p style="margin:20px 0 0;max-width:640px;font-size:18px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">
      Tokens, components, voice, and conventions. Everything you need to ship a new screen that feels exactly like the rest of Circles Core.
    </p>
    <div style="display:flex;align-items:center;gap:8px;margin-top:28px;flex-wrap:wrap;">
      <Pill color="neutral">11 sections</Pill>
      <Pill color="neutral">24 components</Pill>
      <Pill color="neutral">8 source files</Pill>
      <Pill color="neutral">No CSS, no Tailwind</Pill>
    </div>
  </section>

  <!-- TOC -->
  <section style="max-width:{MAXW}px;margin:0 auto;padding:40px 28px 0;">
    <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
      {#each tocItems as [n, label, id], i}
        <a href="#{id}" style="
          display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:16px;
          padding:14px 22px;text-decoration:none;
          border-bottom:{i < tocItems.length - 1 ? `1px solid ${T.hairlineSoft}` : 'none'};
          color:{T.ink};
        ">
          <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkSubtle};">{n}</span>
          <span style="font-size:15px;font-weight:540;">{label}</span>
          <Icon name="arrowRight" size={14} stroke={T.inkSubtle} />
        </a>
      {/each}
    </div>
  </section>

  <!-- ══ 01 BRAND ══ -->
  <section id="brand" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">01 · Brand</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">What Circles feels like</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Circles is a credit network of people, not a finance app. The product should feel warm, slightly hand-made, and quietly confident. Less Bloomberg, more good neighbourhood notice-board.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:20px;">
      <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:stretch;">
        {#each brandPillars as p}
          <div style="flex:1 1 220px;padding:18px;border-radius:16px;background:{T.surface};border:1px solid {T.hairlineSoft};">
            <div style="font-family:{T.fontDisplay};font-size:28px;color:{T.ink};letter-spacing:-0.02em;">{p.word}</div>
            <div style="font-size:13px;color:{T.inkBody};margin-top:4px;line-height:1.5;">{p.desc}</div>
          </div>
        {/each}
      </div>

      <h3 style="margin:32px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Voice — short rules</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        {@html note('do',   'Plain verbs: <i>send</i>, <i>trust</i>, <i>mint</i>, <i>scan</i>, <i>route</i>. Use them as labels.')}
        {@html note('dont', 'No "transact", "execute", "leverage". Skip the financialese.')}
        {@html note('do',   'Lowercase usernames (paul, lina). Display names show as written.')}
        {@html note('dont', 'Don\'t refer to it as "the platform" or "the protocol" in UI copy.')}
        {@html note('do',   'Money is shown as <code style="font-family:\'JetBrains Mono\',monospace">42.00 CRC</code>, two decimals, tabular.')}
        {@html note('dont', 'Never abbreviate to "c" or "circle" as a unit. It\'s CRC.')}
      </div>
    </div>
  </section>

  <!-- ══ 02 COLOR ══ -->
  <section id="color" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">02 · Color</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Tokens, not paints</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Always reach for a token by intent. New colors mean new decisions; reuse existing ones whenever the meaning matches.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:28px;">
      {#each colorGroups as g}
        <div>
          <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">{g.title}</h3>
          <div style="display:flex;flex-wrap:wrap;gap:12px;">
            {#each g.items as [name, value, intent, dark]}
              <div style="flex:1 1 200px;min-width:200px;background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
                <div style="height:88px;background:{value};position:relative;">
                  <span style="position:absolute;bottom:8px;left:10px;font-family:{T.fontMono};font-size:11px;color:{dark ? '#fff' : T.ink};background:{dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)'};padding:2px 6px;border-radius:4px;">{value}</span>
                </div>
                <div style="padding:10px 12px 12px;">
                  <div style="font-size:13px;font-weight:580;color:{T.ink};font-family:{T.fontMono};">{name}</div>
                  <div style="font-size:11.5px;color:{T.inkMuted};margin-top:2px;line-height:1.45;">{intent}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
      <div style="padding:12px 14px;border-radius:12px;background:{T.primaryFaint};display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:{T.inkBody};line-height:1.55;">
        <Icon name="info" size={15} stroke={T.primaryDeep} style="flex-shrink:0;margin-top:2px;" />
        <div>Reference colors via <code style="font-family:{T.fontMono};">T.primary</code> (imported from <code style="font-family:{T.fontMono};">tokens.ts</code>). Never hardcode hex outside <code style="font-family:{T.fontMono};">tokens.ts</code>.</div>
      </div>
    </div>
  </section>

  <!-- ══ 03 TYPOGRAPHY ══ -->
  <section id="type" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">03 · Typography</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Instrument Serif for moments, Inter Tight for everything else</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Display serif carries weight on numbers, names, and short titles. Inter Tight handles the rest with a tighter letter-fit that pairs cleanly.</p>
    </div>
    <div style="margin-top:36px;">
      <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Stack</h3>
      <div style="display:grid;grid-template-columns:180px 1fr;row-gap:8px;column-gap:16px;padding:14px 16px;background:{T.surface};border-radius:12px;border:1px solid {T.hairlineSoft};font-family:{T.fontMono};font-size:12.5px;">
        <span style="color:{T.inkMuted};">Display</span><span style="color:{T.ink};">{T.fontDisplay}</span>
        <span style="color:{T.inkMuted};">Sans</span><span style="color:{T.ink};">{T.fontSans}</span>
        <span style="color:{T.inkMuted};">Mono</span><span style="color:{T.ink};">{T.fontMono}</span>
      </div>

      <h3 style="margin:32px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Scale</h3>
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        {#each typeScale as s, i}
          <div style="display:grid;grid-template-columns:160px 1fr 220px;align-items:center;gap:16px;padding:14px 18px;border-bottom:{i < typeScale.length - 1 ? `1px solid ${T.hairlineSoft}` : 'none'};">
            <span style="font-size:11.5px;color:{T.inkMuted};font-weight:580;">{s.label}</span>
            <span style="font-family:{s.family};font-size:{s.size}px;color:{s.color ?? T.ink};font-weight:{s.weight};letter-spacing:{s.ls ?? 'normal'};text-transform:{s.upper ? 'uppercase' : 'none'};line-height:{s.size > 40 ? 1.05 : 1.4};">{s.text}</span>
            <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkSubtle};text-align:right;">{s.spec}</span>
          </div>
        {/each}
      </div>

      <h3 style="margin:32px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Rules</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        {@html note('do',   'Use display serif for amounts &gt; 24px and section titles. It earns the moment.')}
        {@html note('dont', 'Don\'t use display serif for buttons, body copy, or anything &lt; 22px.')}
        {@html note('do',   'Tabular numerals on every CRC value: <code style="font-family:\'JetBrains Mono\',monospace">font-variant-numeric: tabular-nums</code>')}
        {@html note('dont', 'Don\'t justify text. Use <code style="font-family:\'JetBrains Mono\',monospace">text-wrap: pretty</code> for blocks.')}
      </div>
    </div>
  </section>

  <!-- ══ 04 LAYOUT ══ -->
  <section id="layout" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">04 · Layout</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Spacing, radii, shadows, hairlines</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">A small, opinionated set. Don't invent new values — reach for the closest existing one.</p>
    </div>
    <div style="margin-top:36px;">
      <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Spacing scale (multiples of 2)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">
        {#each spacingScale as n}
          <div style="flex:0 0 auto;padding:14px;border-radius:10px;background:{T.surface};border:1px solid {T.hairlineSoft};display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px;">
            <div style="width:{n}px;height:{n}px;background:{T.primary};border-radius:2px;"></div>
            <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkBody};">{n}px</span>
          </div>
        {/each}
      </div>

      <h3 style="margin:32px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Radii</h3>
      <div style="display:flex;flex-wrap:wrap;gap:14px;">
        {#each Object.entries(T.radius) as [k, v]}
          <div style="flex:0 0 auto;padding:16px;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;display:flex;flex-direction:column;gap:8px;align-items:center;min-width:120px;">
            <div style="width:64px;height:48px;background:{T.primarySoft};border-radius:{v}px;"></div>
            <div style="display:flex;flex-direction:column;gap:1px;align-items:center;">
              <span style="font-family:{T.fontMono};font-size:12px;color:{T.ink};">{k}</span>
              <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">{v === 9999 ? 'pill' : `${v}px`}</span>
            </div>
          </div>
        {/each}
      </div>

      <h3 style="margin:32px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Shadows</h3>
      <div style="display:flex;flex-wrap:wrap;gap:20px;">
        {#each Object.entries(T.shadow) as [k, v]}
          <div style="flex:1 1 200px;padding:32px;background:{T.page};border-radius:14px;display:flex;align-items:center;justify-content:center;">
            <div style="width:120px;height:80px;border-radius:12px;background:{T.surface};box-shadow:{v};display:flex;align-items:center;justify-content:center;font-family:{T.fontMono};font-size:12px;color:{T.inkBody};">{k}</div>
          </div>
        {/each}
      </div>

      <h3 style="margin:32px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Hairlines</h3>
      <div style="background:{T.surface};border-radius:14px;padding:18px;border:1px solid {T.hairlineSoft};">
        <div style="height:1px;background:{T.hairline};margin-bottom:8px;"></div>
        <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">hairline · rgba(31,17,70,0.08) — default 1px borders</span>
        <div style="height:1px;background:{T.hairlineSoft};margin-top:14px;margin-bottom:8px;"></div>
        <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">hairlineSoft · rgba(31,17,70,0.05) — list separators, card edges</span>
      </div>
    </div>
  </section>

  <!-- ══ 05 COMPONENTS ══ -->
  <section id="components" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">05 · Components</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">The kit</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Every screen is composed from this set. If you need something new, ask whether you can compose it from these first.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:18px;">

      <!-- Button -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Button&gt; · variants × sizes</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;">
          <Button variant="primary" icon="send">Send</Button>
          <Button variant="secondary" iconRight="arrowRight">Review</Button>
          <Button variant="soft" icon="trust">Trust mia</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Block</Button>
        </div>
        <pre style="margin:0;padding:14px 16px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;"><code>&lt;Button variant="primary"   icon="send"&gt;Send&lt;/Button&gt;
&lt;Button variant="secondary" iconRight="arrowRight"&gt;Review&lt;/Button&gt;
&lt;Button variant="soft"      icon="trust"&gt;Trust mia&lt;/Button&gt;
&lt;Button variant="ghost"&gt;Cancel&lt;/Button&gt;</code></pre>
      </div>

      <!-- Pill -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Pill&gt; · color variants</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;">
          {#each ['lilac', 'sage', 'coral', 'butter', 'rose', 'neutral', 'positive', 'negative', 'ink', 'subtle'] as c}
            <Pill color={c}>{c}</Pill>
          {/each}
        </div>
        <pre style="margin:0;padding:14px 16px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;"><code>&lt;Pill color="lilac"&gt;Featured&lt;/Pill&gt;  &lt;Pill color="sage"&gt;Mutual&lt;/Pill&gt;  &lt;Pill color="coral"&gt;Sent&lt;/Pill&gt;</code></pre>
      </div>

      <!-- Avatar -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Avatar&gt; · gradient + token + group + AvatarStack</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:16px;">
          <Avatar seed="paul" size={48} />
          <Avatar seed="lina_b" size={48} />
          <Avatar seed="x" size={48} kind="token" />
          <Avatar seed="x" size={48} kind="group" />
          <AvatarStack seeds={['lina', 'kasper', 'paul', 'mia']} size={36} />
        </div>
        <pre style="margin:0;padding:14px 16px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;"><code>&lt;Avatar seed="paul" size={'{'}44{'}'} /&gt;
&lt;Avatar seed="x" size={'{'}44{'}'} kind="token" /&gt;
&lt;AvatarStack seeds={'{'}['lina','kasper','paul']{'}'} size={'{'}28{'}'} /&gt;</code></pre>
      </div>

      <!-- Tabs -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Tabs&gt; · segmented</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;align-items:center;justify-content:center;">
          <Tabs value="people" items={[
            { id: 'people',      label: 'People',      count: 247 },
            { id: 'pending',     label: 'Pending',     count: 3   },
            { id: 'suggestions', label: 'Suggestions'             },
          ]} />
        </div>
      </div>

      <!-- Money -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Money&gt; · signed + unit</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:24px;">
          <Money value={42.0} />
          <Money value={5399.99} signed size={22} />
          <Money value={-2.4} signed size={16} />
          <Money value={0.004} size={13} />
        </div>
        <pre style="margin:0;padding:14px 16px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;"><code>&lt;Money value={'{'}42.0{'}'} /&gt;
&lt;Money value={'{'}5399.99{'}'} signed size={'{'}20{'}'} /&gt;
&lt;Money value={'{'-2.4}'} signed /&gt;</code></pre>
      </div>

      <!-- Card -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Card&gt; · base surface (use for any lifted block)</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;align-items:center;justify-content:center;">
          <Card style="min-width:280px;">
            <div style="display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Group</span>
              <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.02em;">Berlin Coop</span>
              <span style="font-size:12.5px;color:{T.inkBody};">1,284 members</span>
            </div>
          </Card>
        </div>
        <pre style="margin:0;padding:14px 16px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;"><code>&lt;Card padding={'{'}20{'}'}&gt;…&lt;/Card&gt;</code></pre>
      </div>

      <!-- Icon set -->
      <div style="background:{T.surface};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid {T.hairlineSoft};">
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};font-weight:580;">&lt;Icon&gt; · stroke icon set</span>
        </div>
        <div style="padding:24px;background:{T.page};display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
          {#each allIcons as n}
            <div style="padding:10px;background:{T.surface};border-radius:8px;border:1px solid {T.hairlineSoft};display:flex;flex-direction:column;align-items:center;gap:6px;min-width:64px;">
              <Icon name={n} size={18} stroke={T.ink} />
              <span style="font-family:{T.fontMono};font-size:9px;color:{T.inkMuted};">{n}</span>
            </div>
          {/each}
        </div>
        <pre style="margin:0;padding:14px 16px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;"><code>&lt;Icon name="send" size={'{'}18{'}'} stroke={'{'}T.ink{'}'} /&gt;
// All icons are 24×24 viewBox, stroke 1.6, line-only.</code></pre>
      </div>

    </div>
  </section>

  <!-- ══ 06 COMPOSITIONS ══ -->
  <section id="compositions" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">06 · Composition</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Recipes, not pages</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">The recurring structures we use across every screen. Each one is a target shape — copy it when you build something new.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:24px;">

      <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Hero balance card</h3>
      <Card padding={24} style="background:radial-gradient(120% 140% at 100% 0%,{T.lilacSoft} 0%,{T.surface} 65%);">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Total balance</span>
            <Pill color="sage">+ 24.00 today</Pill>
          </div>
          <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">
            <Icon name="more" size={16} stroke={T.inkBody} />
          </button>
        </div>
        <div style="font-family:{T.fontDisplay};font-size:64px;line-height:1;color:{T.ink};letter-spacing:-0.025em;margin-top:14px;">
          100.34<span style="margin-left:8px;font-family:{T.fontSans};font-size:16px;font-weight:500;color:{T.inkMuted};letter-spacing:0;">CRC</span>
        </div>
      </Card>
      <div style="padding:12px 14px;border-radius:12px;background:{T.primaryFaint};display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:{T.inkBody};line-height:1.55;">
        <Icon name="info" size={15} stroke={T.primaryDeep} style="flex-shrink:0;margin-top:2px;" />
        <div>Hero pattern: <b>eyebrow + pill</b> top-left, <b>icon-button</b> top-right, <b>display number</b> with sans unit, optional breakdown row underneath.</div>
      </div>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">List card (rows w/ avatar + label + value)</h3>
      <Card padding={0} style="overflow:hidden;">
        {#each CirclesData.activity.slice(0, 3) as row, i}
          <div style="display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;padding:14px 18px;border-bottom:{i < 2 ? `1px solid ${T.hairlineSoft}` : 'none'};">
            <Avatar seed={row.who} size={40} />
            <div style="display:flex;flex-direction:column;gap:1px;">
              <span style="font-size:13.5px;font-weight:540;color:{T.ink};">{row.who}</span>
              <span style="font-size:11.5px;color:{T.inkMuted};">{row.when}</span>
            </div>
            <Money value={row.amount} signed size={13} />
          </div>
        {/each}
      </Card>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Modal sheet (mobile) / Drawer (desktop)</h3>
      <div style="position:relative;height:360px;border-radius:16px;overflow:hidden;background:{T.pageDeep};border:1px solid {T.hairlineSoft};">
        <div style="position:absolute;inset:0;background:rgba(15,10,30,0.45);backdrop-filter:blur(8px);"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;background:{T.surface};border-radius:24px 24px 0 0;padding:14px 22px 22px;max-height:70%;">
          <div style="display:flex;justify-content:center;">
            <span style="width:36px;height:4px;border-radius:2px;background:rgba(15,10,30,0.18);display:block;"></span>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
            <span style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};letter-spacing:-0.02em;">Sheet pattern</span>
            <span style="font-size:13px;color:{T.inkBody};">One shared shell. Drag handle, rounded top, 22px padding. Drawer is the same body in a right-aligned 480px-wide panel.</span>
          </div>
        </div>
      </div>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Empty state</h3>
      <Card padding={36}>
        <div style="display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;max-width:400px;margin:0 auto;">
          <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,{T.lilacSoft},{T.coralSoft});display:flex;align-items:center;justify-content:center;">
            <Icon name="contacts" size={24} stroke={T.primary} strokeWidth={1.6} />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
            <span style="font-family:{T.fontDisplay};font-size:28px;color:{T.ink};letter-spacing:-0.02em;">Nothing here yet</span>
            <span style="font-size:13.5px;color:{T.inkBody};line-height:1.55;">Trust someone to start your network. Even one connection unlocks the routing graph.</span>
          </div>
          <Button variant="primary" icon="trust">Trust someone</Button>
        </div>
      </Card>
      <div style="padding:12px 14px;border-radius:12px;background:{T.sageSoft};display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:{T.inkBody};line-height:1.55;">
        <Icon name="check" size={15} stroke="#1F5E37" style="flex-shrink:0;margin-top:2px;" />
        <div>Empty states are warm. Always offer a clear next action with a verb-first label.</div>
      </div>
    </div>
  </section>

  <!-- ══ 07 ICONS ══ -->
  <section id="icons" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">07 · Iconography</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Stroke, not fill</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">One simple stroke style, used everywhere. No filled icons, no two-tone, no decorative gradients on glyphs.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:grid;grid-template-columns:180px 1fr;row-gap:8px;column-gap:16px;padding:14px 16px;background:{T.surface};border-radius:12px;border:1px solid {T.hairlineSoft};font-family:{T.fontMono};font-size:12.5px;">
        <span style="color:{T.inkMuted};">ViewBox</span>     <span style="color:{T.ink};">24 × 24</span>
        <span style="color:{T.inkMuted};">Stroke</span>      <span style="color:{T.ink};">1.6 default · 1.8 inside small chips · 2.0 in pill button FAB</span>
        <span style="color:{T.inkMuted};">Caps / joins</span><span style="color:{T.ink};">round / round</span>
        <span style="color:{T.inkMuted};">Fill</span>         <span style="color:{T.ink};">none — except `verified` (uses primarySoft as fill)</span>
        <span style="color:{T.inkMuted};">Sizes</span>        <span style="color:{T.ink};">12 · 14 · 16 · 18 · 20 · 24 — never odd values</span>
        <span style="color:{T.inkMuted};">Color</span>        <span style="color:{T.ink};">inherits via currentColor or pass stroke prop</span>
      </div>
      <div style="padding:12px 14px;border-radius:12px;background:{T.primaryFaint};display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:{T.inkBody};line-height:1.55;">
        <Icon name="info" size={15} stroke={T.primaryDeep} style="flex-shrink:0;margin-top:2px;" />
        <div>When in doubt, use the <code style="font-family:{T.fontMono};">info</code> icon. We have a finite set — extending requires a new path in <code style="font-family:{T.fontMono};">Icon.svelte</code>.</div>
      </div>
    </div>
  </section>

  <!-- ══ 08 MOTION ══ -->
  <section id="motion" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">08 · Motion</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Quick, soft, intentional</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Movement is feedback, not decoration. If a transition isn't serving comprehension, cut it.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:grid;grid-template-columns:180px 1fr;row-gap:8px;column-gap:16px;padding:14px 16px;background:{T.surface};border-radius:12px;border:1px solid {T.hairlineSoft};font-family:{T.fontMono};font-size:12.5px;">
        <span style="color:{T.inkMuted};">Default duration</span><span style="color:{T.ink};">180ms</span>
        <span style="color:{T.inkMuted};">Sheet / drawer</span>  <span style="color:{T.ink};">260ms</span>
        <span style="color:{T.inkMuted};">Hover</span>           <span style="color:{T.ink};">120ms</span>
        <span style="color:{T.inkMuted};">Easing</span>          <span style="color:{T.ink};">cubic-bezier(0.2, 0.7, 0.3, 1)  — gentle out</span>
        <span style="color:{T.inkMuted};">Sheet enter</span>     <span style="color:{T.ink};">translateY(100%) → 0  + opacity 0 → 1 on scrim</span>
        <span style="color:{T.inkMuted};">Drawer enter</span>    <span style="color:{T.ink};">translateX(100%) → 0  + opacity 0 → 1 on scrim</span>
        <span style="color:{T.inkMuted};">Press</span>           <span style="color:{T.ink};">transform: scale(0.98)  · 80ms</span>
        <span style="color:{T.inkMuted};">Reduced motion</span> <span style="color:{T.ink};">Respect prefers-reduced-motion: reduce — fade only</span>
      </div>
      <div style="padding:12px 14px;border-radius:12px;background:{T.coralSoft};display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:{T.inkBody};line-height:1.55;">
        <Icon name="close" size={15} stroke="#8A3A1E" style="flex-shrink:0;margin-top:2px;" />
        <div>No bouncy springs. No staggered list reveals. No lottie celebrations except the Mint moment, which is intentional and bounded.</div>
      </div>
    </div>
  </section>

  <!-- ══ 09 COPY ══ -->
  <section id="copy" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">09 · Copy & numbers</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Plain, specific, and tabular</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Treat copy and number formatting like part of the design system. Inconsistency here is expensive.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:20px;">
      <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Numbers</h3>
      <div style="display:grid;grid-template-columns:180px 1fr;row-gap:8px;column-gap:16px;padding:14px 16px;background:{T.surface};border-radius:12px;border:1px solid {T.hairlineSoft};font-family:{T.fontMono};font-size:12.5px;">
        <span style="color:{T.inkMuted};">CRC values</span>    <span style="color:{T.ink};">2 decimals always. `42.00 CRC`, never `42 CRC`.</span>
        <span style="color:{T.inkMuted};">Sub-cent</span>      <span style="color:{T.ink};">Render as `&lt; 0.01 CRC` (handled by &lt;Money&gt;).</span>
        <span style="color:{T.inkMuted};">Thousands</span>     <span style="color:{T.ink};">Locale en-US separators: `5,399.99 CRC`.</span>
        <span style="color:{T.inkMuted};">Tabular nums</span>  <span style="color:{T.ink};">font-variant-numeric on every CRC display.</span>
        <span style="color:{T.inkMuted};">Fiat</span>          <span style="color:{T.ink};">Approx-prefix and €: `≈ €38.22`.</span>
        <span style="color:{T.inkMuted};">Addresses</span>     <span style="color:{T.ink};">First 4 + last 4 with ellipsis: `0xc175…FdEe91`.</span>
        <span style="color:{T.inkMuted};">Time</span>          <span style="color:{T.ink};">`12 min ago`, `1 h ago`, `yesterday`, `3 Jul`.</span>
      </div>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Labels (verb-first, present tense)</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        {@html note('do',   'Send · Receive · Trust · Mint · Scan')}
        {@html note('dont', 'Send Now · Send Funds · Initiate Transfer · Make Payment')}
        {@html note('do',   'Trust mia · Join Berlin Coop')}
        {@html note('dont', 'Add to Contacts · Become a Member')}
        {@html note('do',   'Sentence case in long copy. Title Case in eyebrows + button labels.')}
        {@html note('dont', 'SCREAMING CAPS in body or button text.')}
      </div>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Errors &amp; states</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">
        {@html note('warn', '<b>Error copy is specific.</b> Bad: "Something went wrong." Good: "No trust path to mia. Ask a mutual to vouch."')}
        {@html note('warn', '<b>Loading copy is honest.</b> "Routing through your network…" beats "Loading…" every time.')}
      </div>
    </div>
  </section>

  <!-- ══ 10 WORKED EXAMPLE ══ -->
  <section id="example" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">10 · Worked example</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Building a Group Detail page</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">A new screen, end-to-end, using only existing primitives. Use this as the template when you need to ship something we haven't drawn yet.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:20px;">
      <h3 style="margin:0 0 8px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">1. Sketch the shell</h3>
      <pre style="margin:0;padding:14px 16px;border-radius:12px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;white-space:pre;"><code>&lt;AppShell active="groups"
  top={'{'}#snippet top(){'}'}
    &lt;TopBar
      eyebrow="Groups / Berlin Coop"
      title="Berlin Coop"
      subtitle="1,284 members · Mutual-aid coop in Kreuzberg"
    /&gt;
  {'{/snippet}'}&gt;
  &lt;Stack gap={'{'}20{'}'}&gt;
    &lt;!-- hero, stats, members, treasury, activity --&gt;
  &lt;/Stack&gt;
&lt;/AppShell&gt;</code></pre>

      <h3 style="margin:16px 0 8px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">2. Reach for existing recipes</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">
        {@html note('do', '<b>Hero card</b> — group name in display serif, member count, "Join" button. Reuse the wallet-hero composition.')}
        {@html note('do', '<b>Stats row</b> — three cards (treasury, weekly volume, mint policy). Uses the same 3-up grid as Profile stats.')}
        {@html note('do', '<b>Members</b> — same list-card pattern as Activity. Avatar + name + role pill + "Trust" button.')}
        {@html note('do', '<b>Treasury chart</b> — sparkline component. Same as wallet hero.')}
        {@html note('do', '<b>Activity</b> — filter CirclesData.activity by group.')}
      </div>

      <h3 style="margin:16px 0 8px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">3. Use tokens, not values</h3>
      <pre style="margin:0;padding:14px 16px;border-radius:12px;background:{T.ink};color:#E8E3F0;font-family:{T.fontMono};font-size:12.5px;line-height:1.6;overflow:auto;white-space:pre;"><code>// ❌ Wrong
&lt;div style="padding:24px;background:#FFFFFF;border-radius:20px"&gt;

// ✅ Right
&lt;Card padding={'{'}24{'}'}&gt;</code></pre>

      <h3 style="margin:16px 0 8px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">4. Compose; don't reinvent</h3>
      {@html note('info', 'If your new screen needs a button, pill, avatar, money, list row, or modal — they exist. Search the design system first. Custom components have a high bar; they need a real reason.')}
    </div>
  </section>

  <!-- ══ 11 HANDOFF ══ -->
  <section id="handoff" style="max-width:{MAXW}px;margin:0 auto;padding:{PAD}px 28px;border-top:1px solid {T.hairlineSoft};">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-size:11.5px;font-weight:600;color:{T.primary};letter-spacing:0.12em;text-transform:uppercase;">11 · Engineering handoff</span>
      <h2 style="margin:0;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">What's in the system</h2>
      <p style="margin:6px 0 0;max-width:640px;font-size:16px;line-height:1.55;color:{T.inkBody};text-wrap:pretty;">Conventions, file map, and component graph so anyone (or any agent) can pick up where this design left off.</p>
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:20px;">
      <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">File map</h3>
      <div style="display:grid;grid-template-columns:280px 1fr;row-gap:8px;column-gap:16px;padding:14px 16px;background:{T.surface};border-radius:12px;border:1px solid {T.hairlineSoft};font-family:{T.fontMono};font-size:12px;">
        {#each fileMap as [f, desc]}
          <span style="color:{T.inkMuted};">{f}</span>
          <span style="color:{T.inkBody};font-family:{T.fontSans};font-size:12.5px;">{desc}</span>
        {/each}
      </div>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Conventions</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">
        {@html note('do',   'Import tokens as `T` from `$lib/design-system/tokens.js`. Never hardcode hex.')}
        {@html note('do',   'All layout via inline styles + tokens. No Tailwind classes in design-system components.')}
        {@html note('do',   'Svelte 5 runes throughout: $props(), $state(), $derived(), {"{#snippet}"}, {@render}.')}
        {@html note('dont', 'No new fonts. No new colors. No new icon glyphs without updating Icon.svelte.')}
        {@html note('dont', 'No className in design-system components. Inline styles + T tokens, full stop.')}
      </div>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Adding a new screen — checklist</h3>
      <ol style="padding-left:20px;color:{T.inkBody};font-size:14px;line-height:1.7;margin:0;">
        <li>Add it to <code style="font-family:{T.fontMono};">src/lib/design-system/screens/</code> in the right folder (desktop / mobile / modals).</li>
        <li>Use existing primitives + AppShell or MobileShell. No custom layouts.</li>
        <li>Pull data from <code style="font-family:{T.fontMono};">CirclesData</code>; extend it (don't hardcode in screens).</li>
        <li>Import and render it in <code style="font-family:{T.fontMono};">src/routes/design/+page.svelte</code>.</li>
        <li>Run <code style="font-family:{T.fontMono};">npm run check</code>; verify no errors; commit.</li>
      </ol>

      <h3 style="margin:16px 0 12px;font-size:13px;font-weight:600;color:{T.inkMuted};letter-spacing:0.08em;text-transform:uppercase;">Open work (suggested next)</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        {#each openWork as t}
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:{T.surfaceAlt};border-radius:10px;border:1px solid {T.hairlineSoft};">
            <Icon name="chevronRight" size={14} stroke={T.primary} />
            <span style="font-size:13.5px;color:{T.inkBody};">{t}</span>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer style="max-width:{MAXW}px;margin:80px auto 0;padding:40px 28px;border-top:1px solid {T.hairlineSoft};display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:10px;">
      <CirclesLogo size={20} />
      <span style="font-size:12.5px;color:{T.inkMuted};">Circles Core · Style Guide v1</span>
    </div>
    <span style="font-size:12.5px;color:{T.inkMuted};font-family:{T.fontMono};">built with the system it documents</span>
  </footer>

</div>

