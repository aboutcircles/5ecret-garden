<script lang="ts">
  interface Props {
    label?: string;
    class?: string;
  }

  let { label = 'Loading…', class: extraClass = '' }: Props = $props();
</script>

<div
  class={`w-full py-6 text-center text-base-content/60 ${extraClass}`}
  aria-live="polite"
  aria-busy="true"
>
  <span class="loading loading-spinner text-primary"></span>
  <span class="ml-2">{label}</span>
</div>
