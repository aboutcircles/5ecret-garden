<script lang="ts">
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

<header class="space-y-1.5">
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h2 class="text-sm font-medium leading-tight text-base-content/90">{title}</h2>
      {#if subtitle}
        <p class="text-xs text-base-content/60 mt-0.5">{subtitle}</p>
      {/if}
    </div>
    <div class="badge badge-ghost badge-xs shrink-0 text-base-content/70">{step}/{total}</div>
  </div>

  <div class="flex items-center gap-1" aria-label={`Step ${step} of ${total}`}>
    {#each Array(total) as _, index}
      <span
        class="h-1 flex-1 rounded-full bg-base-300 transition-colors"
        class:bg-primary={index <= activeIndex}
        class:opacity-75={index <= activeIndex}
        class:opacity-45={index > activeIndex}
      ></span>
    {/each}
  </div>

  {#if labels.length}
    <div class="text-[10px] flex items-center justify-between gap-2">
      {#each labels as label, index}
        <span
          class="truncate transition-opacity text-base-content"
          class:opacity-80={index === activeIndex}
          class:opacity-45={index !== activeIndex}
        >{label}</span>
      {/each}
    </div>
  {/if}
</header>
