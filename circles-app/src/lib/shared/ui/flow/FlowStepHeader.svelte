<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    step: number;
    total: number;
    title: string;
    subtitle?: string;
    labels?: readonly string[];
  }

  let { step, total, title, subtitle, labels = [] }: Props = $props();

  const activeIndex = $derived.by(() => {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(total - 1, step - 1));
  });
</script>

<header style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px;">
  <!-- Title row -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
    <div style="min-width:0;flex:1;">
      <h2 style="font-family:{T.fontDisplay};font-size:24px;font-weight:400;letter-spacing:-0.015em;line-height:1.15;color:{T.ink};margin:0;">{title}</h2>
      {#if subtitle}
        <p style="font-size:12.5px;color:{T.inkMuted};margin:4px 0 0;line-height:1.45;">{subtitle}</p>
      {/if}
    </div>
    {#if total > 1}
      <span style="
        flex-shrink:0;display:inline-flex;align-items:center;
        padding:4px 10px;border-radius:9999px;
        background:{T.pageDeep};color:{T.inkBody};
        font-family:{T.fontMono};font-size:11px;font-weight:580;
        font-variant-numeric:tabular-nums;
      ">{step}/{total}</span>
    {/if}
  </div>

  <!-- Progress bar -->
  {#if total > 1}
    <div style="display:flex;align-items:center;gap:4px;" aria-label={`Step ${step} of ${total}`}>
      {#each Array(total) as _, index}
        <span style="
          height:3px;flex:1;border-radius:9999px;
          background:{index <= activeIndex ? T.primary : T.pageDeep};
          opacity:{index <= activeIndex ? 1 : 0.6};
          transition:background .15s;
        "></span>
      {/each}
    </div>
  {/if}

  {#if labels.length}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px;">
      {#each labels as label, index}
        <span style="
          font-size:10.5px;flex:1;text-align:{index === 0 ? 'left' : index === labels.length - 1 ? 'right' : 'center'};
          color:{index === activeIndex ? T.ink : T.inkSubtle};
          font-weight:{index === activeIndex ? 580 : 500};
          letter-spacing:0.02em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          transition:color .15s;
        ">{label}</span>
      {/each}
    </div>
  {/if}
</header>
