<script lang="ts">
  import type { Snippet } from 'svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';

  interface Props extends Record<string, any> {
    step: number;
    total: number;
    title: string;
    subtitle?: string;
    labels?: readonly string[];
    size?: 'md' | 'lg' | 'xl';
    className?: string;
    children?: Snippet;
  }

  let {
    step,
    total,
    title,
    subtitle,
    labels = [],
    size = 'lg',
    className = 'w-full space-y-4',
    children,
    ...rest
  }: Props = $props();
</script>

<FlowDecoration {size}>
  <div class={className} tabindex="-1" data-popup-initial-focus {...rest}>
    <FlowStepHeader {step} {total} {title} {subtitle} {labels} />
    {@render children?.()}
  </div>
</FlowDecoration>
