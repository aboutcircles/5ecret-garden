<script lang="ts">
  import { popupControls, popupState } from '$lib/shared/state/popup';

  interface Props {
    step?: number;
  }

  let { step = 1 }: Props = $props();

  function openNext() {
    const currentComponent = $popupState.content?.component;
    if (!currentComponent) return;

    popupControls.open({
      title: `Demo popup step ${step + 1}`,
      component: currentComponent,
      props: { step: step + 1 }
    });
  }
</script>

<div class="space-y-4">
  <p class="text-sm opacity-80">
    This is popup stack step <strong>{step}</strong>. Use “Open next” to push another popup and test back-stack behavior.
  </p>

  <div class="flex flex-wrap gap-2">
    <button class="btn btn-sm btn-primary" onclick={openNext}>Open next</button>
    <button class="btn btn-sm btn-outline" onclick={() => popupControls.back()}>Back</button>
    <button class="btn btn-sm btn-ghost" onclick={() => popupControls.close()}>Close all</button>
  </div>
</div>
