<script lang="ts">
  interface Props {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'neutral';
  }

  let { label, variant = 'neutral' }: Props = $props();

  const classes: Record<NonNullable<Props['variant']>, string> = {
    success: 'badge-outline badge-success text-success',
    warning: 'badge-outline badge-warning text-warning',
    error: 'badge-outline badge-error text-error',
    neutral: 'badge-outline text-base-content/70',
  };
</script>

<span class={`badge badge-sm font-medium text-xs ${classes[variant]}`}>{label}</span>
