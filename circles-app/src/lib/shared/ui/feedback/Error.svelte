<script lang="ts">
  interface Props {
    errorMessage?: string;
    stackTrace?: string;
  }

  let {
    errorMessage = 'An unexpected error occurred.',
    stackTrace = '',
  }: Props = $props();
</script>

<!-- Modal Content -->
<div class="p-6 max-h-[70vh] overflow-y-auto">
  <div class="space-y-4">
    <p class="text-lg text-error-content break-words">
      {errorMessage}
    </p>

    {#if stackTrace}
      <details class="bg-base-100 border-l-4 border-error p-4 rounded-md">
        <summary class="text-lg font-semibold cursor-pointer">
          Stack Trace
        </summary>
        <pre
          class="whitespace-pre-wrap break-words text-sm mt-2 p-2 bg-neutral text-neutral-content rounded-md">{stackTrace}</pre>
      </details>
    {/if}
  </div>
</div>
