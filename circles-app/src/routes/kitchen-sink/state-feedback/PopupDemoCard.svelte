<script lang="ts">
  import { popupControls, popupState } from '$lib/shared/state/popup';

  interface Props {
    step?: number;
  }

  import { T } from '$lib/design-system/tokens';

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

<div style=”display:flex;flex-direction:column;gap:16px;”>
  <p style=”font-size:13px;color:{T.inkMuted};margin:0;”>
    This is popup stack step <strong>{step}</strong>. Use “Open next” to push another popup and test back-stack behavior.
  </p>

  <div style=”display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;”>
    <button style=”height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;” onclick={openNext}>Open next</button>
    <button style=”height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;” onclick={() => popupControls.back()}>Back</button>
    <button style=”height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:12.5px;font-weight:580;cursor:pointer;” onclick={() => popupControls.close()}>Close all</button>
  </div>
</div>
