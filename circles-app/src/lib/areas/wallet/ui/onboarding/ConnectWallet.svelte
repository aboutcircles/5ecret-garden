<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  interface Props {
    imgUrl: string;
    header: string;
    desc: string;
    route: string;
    recommended?: 'Connect' | 'Register' | undefined;
  }

  let {
    imgUrl,
    header,
    desc,
    route,
    recommended = undefined
  }: Props = $props();

  const palette = $derived.by(() => {
    if (recommended === 'Connect') {
      return {
        bg: T.sageSoft,
        border: 'rgba(45,138,82,0.2)',
        hover: 'rgba(220,235,223,0.7)',
        pill: { bg: T.positive, fg: '#fff' },
      };
    }
    if (recommended === 'Register') {
      return {
        bg: T.primaryFaint,
        border: 'rgba(88,73,212,0.2)',
        hover: 'rgba(244,242,254,0.7)',
        pill: { bg: T.primary, fg: '#fff' },
      };
    }
    return {
      bg: T.surface,
      border: T.hairlineSoft,
      hover: T.surfaceAlt,
      pill: null,
    };
  });
</script>

<a
  href={route}
  class="connect-card no-underline"
  style="
    display:flex;align-items:center;justify-content:space-between;gap:14px;
    width:100%;padding:16px 18px;border-radius:18px;
    background:{palette.bg};border:1px solid {palette.border};
    box-shadow:{T.shadow.xs};
    transition:transform .08s,background .15s,box-shadow .15s;
    text-decoration:none;
  "
>
  <div style="display:flex;align-items:center;gap:14px;min-width:0;">
    <div style="
      width:48px;height:48px;border-radius:14px;flex-shrink:0;
      background:rgba(255,255,255,0.6);
      display:inline-flex;align-items:center;justify-content:center;
    ">
      <img src={imgUrl} alt="" style="width:32px;height:32px;" aria-hidden="true" />
    </div>

    <div style="min-width:0;display:flex;flex-direction:column;gap:2px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <h2 style="font-family:{T.fontSans};font-size:15px;font-weight:580;color:{T.ink};letter-spacing:-0.005em;margin:0;">
          {header}
        </h2>
        {#if recommended && palette.pill}
          <span style="
            display:inline-flex;align-items:center;
            padding:2px 8px;border-radius:9999px;
            background:{palette.pill.bg};color:{palette.pill.fg};
            font-family:{T.fontSans};font-size:10px;font-weight:580;letter-spacing:0.04em;text-transform:uppercase;
          ">{recommended}</span>
        {/if}
      </div>
      <p style="margin:0;font-size:12.5px;color:{T.inkBody};line-height:1.45;">{desc}</p>
    </div>
  </div>

  <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
</a>

<style>
  .connect-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15,10,30,0.06), 0 1px 3px rgba(15,10,30,0.04);
  }
</style>
