<script lang="ts">
  import { popupControls, popupState } from '$lib/shared/state/popup';
  import { runTask, tasks } from '$lib/shared/utils/tasks';
  import PopupDemoCard from './PopupDemoCard.svelte';

  const openPopup = () => {
    popupControls.open({
      title: 'Demo popup step 1',
      component: PopupDemoCard,
      props: { step: 1 }
    });
  };

  const openReplacedPopup = () => {
    popupControls.open({
      title: 'Original popup',
      component: PopupDemoCard,
      props: { step: 1 }
    });
    popupControls.replace({
      title: 'Replaced popup',
      component: PopupDemoCard,
      props: { step: 99 }
    });
  };

  const startSuccessTask = () => {
    void runTask({
      name: 'Kitchen sink success task…',
      promise: new Promise((resolve) => setTimeout(resolve, 1200))
    }).catch(() => {});
  };

  const startFailTask = () => {
    void runTask({
      name: 'Kitchen sink failing task…',
      promise: new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Kitchen sink simulated task failure.')), 1200)
      )
    }).catch(() => {});
  };

  const activeTaskCount = $derived($tasks.length);
  const popupDepth = $derived($popupState.stack.length + ($popupState.content ? 1 : 0));
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">State & Feedback</h2>

  <div class="rounded-lg border border-base-300 p-3 bg-base-200/30 text-sm">
    <div><strong>Popup depth:</strong> {popupDepth}</div>
    <div><strong>Active tasks:</strong> {activeTaskCount}</div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Popup store controls (`popupControls`)</h3>
    <p class="text-sm opacity-70">
      <strong>Open + replace</strong> first opens “Original popup”, then immediately swaps current popup content with
      “Replaced popup” without adding another back-stack entry.
    </p>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-sm btn-primary" onclick={openPopup}>Open popup</button>
      <button class="btn btn-sm btn-outline" onclick={openReplacedPopup}>Open + replace</button>
      <button class="btn btn-sm btn-outline" onclick={() => popupControls.back()}>Back</button>
      <button class="btn btn-sm btn-ghost" onclick={() => popupControls.close()}>Close all</button>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Task feedback (`runTask` + `tasks`)</h3>
    <p class="text-sm opacity-70">
      Success task exercises loading toasts. Failing task also demonstrates centralized error popup handling.
    </p>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-sm btn-primary" onclick={startSuccessTask}>Start success task</button>
      <button class="btn btn-sm btn-warning" onclick={startFailTask}>Start failing task</button>
    </div>
  </div>
</section>
