<script lang="ts">
  import { popupControls, popupState } from '$lib/shared/state/popup';
  import { runTask, tasks } from '$lib/shared/utils/tasks';
  import PopupDemoCard from './PopupDemoCard.svelte';
  import { T } from '$lib/design-system/tokens.js';

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

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">State & Feedback</h2>

  <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;background:{T.pageDeep};font-size:13px;">
    <div><strong>Popup depth:</strong> {popupDepth}</div>
    <div><strong>Active tasks:</strong> {activeTaskCount}</div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Popup store controls (`popupControls`)</h3>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      <strong>Open + replace</strong> first opens "Original popup", then immediately swaps current popup content with
      "Replaced popup" without adding another back-stack entry.
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;" onclick={openPopup}>Open popup</button>
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={openReplacedPopup}>Open + replace</button>
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={() => popupControls.back()}>Back</button>
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={() => popupControls.close()}>Close all</button>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Task feedback (`runTask` + `tasks`)</h3>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      Success task exercises loading toasts. Failing task also demonstrates centralized error popup handling.
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;" onclick={startSuccessTask}>Start success task</button>
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid rgba(176,112,20,0.4);background:{T.warningSoft};color:{T.warning};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={startFailTask}>Start failing task</button>
    </div>
  </div>
</section>
