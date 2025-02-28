<script lang="ts">
  export let content: string;
</script>

<div class="tooltip" data-tip={content}>
  {#if $$slots.default}
    <slot />
  {:else}
    <img
      src="/question-mark.svg"
      alt="question mark icon"
      class="w-3 h-3"
    />
  {/if}
</div>
