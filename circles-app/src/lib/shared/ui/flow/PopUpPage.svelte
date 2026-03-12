<script lang="ts">
  interface Props {
    page: any;
    isVisible: boolean;
  }

  let { page, isVisible }: Props = $props();

  let context = $state<any>(undefined);

  // Keep context in sync with page.props.context
  $effect(() => {
    if (page.props?.context) {
      context = page.props.context;
    }
  });

  // Update page.props.context when context changes (for child mutations)
  $effect(() => {
    if (page.props && context) {
      page.props.context = context;
    }
  });

  // Filter out context from other props
  const otherProps = $derived(Object.fromEntries(
    Object.entries(page.props || {}).filter(([k]) => k !== 'context')
  ));
</script>

<div class={`popup-page ${isVisible ? 'is-top' : 'is-hidden'}`} inert={!isVisible}>
  {#if page.props?.context}
    <!-- Bind context here to satisfy Svelte's ownership rules -->
    <page.component bind:context {...otherProps} />
  {:else}
    <page.component {...page.props} />
  {/if}
</div>

<style>
  .popup-page {
    position: relative;
  }
  .popup-page.is-hidden {
    display: none;
  }
  .popup-page.is-top {
    display: block;
  }
</style>
