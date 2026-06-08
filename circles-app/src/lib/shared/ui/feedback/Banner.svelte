<script lang="ts">
  interface Props {
    title: string;
    message?: string;
    tone?: 'info' | 'success' | 'warning' | 'error';
    className?: string;
  }

  let { title, message = '', tone = 'info', className = '' }: Props = $props();

  const toneClasses = {
    info: 'bg-info/10 border-info/40 text-base-content',
    success: 'bg-success/10 border-success/40 text-base-content',
    warning: 'bg-warning/10 border-warning/40 text-base-content',
    error: 'bg-error/10 border-error/40 text-base-content',
  } as const;

  const resolvedToneClass = $derived(toneClasses[tone]);
</script>

<div class={`w-full flex flex-col border-t-4 mb-4 rounded-b px-4 py-3 shadow-md ${resolvedToneClass} ${className}`.trim()}>
  <p class="font-bold">{title}</p>
  {#if message}
    <p class="text-sm text-base-content/80">{message}</p>
  {/if}
</div>
