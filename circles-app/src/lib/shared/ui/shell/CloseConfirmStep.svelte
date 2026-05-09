<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    message?: string;
    onYes: () => void;
    onNo: () => void;
  }

  let {
    message = 'Do you really want to close the form?',
    onYes,
    onNo,
  }: Props = $props();
</script>

<div style="width:100%;max-width:560px;margin:0 auto;padding:8px 0;">
  <p style="font-size:14px;color:{T.inkBody};line-height:1.6;margin:0;">{message}</p>

  <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px;">
    <button
      type="button"
      style="height:36px;padding:0 16px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:13px;cursor:pointer;"
      onclick={onNo}
    >No</button>
    <button
      type="button"
      style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:13px;font-weight:580;cursor:pointer;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
      onclick={onYes}
    >Yes</button>
  </div>
</div>
