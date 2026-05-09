<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    errorMessage?: string;
    stackTrace?: string;
  }

  let { errorMessage = 'An unexpected error occurred.', stackTrace = '' }: Props = $props();
</script>

<div style="padding:24px;max-height:70vh;overflow-y:auto;">
  <div style="display:flex;flex-direction:column;gap:16px;">
    <p style="font-size:16px;color:{T.negative};word-break:break-words;margin:0;">
      {errorMessage}
    </p>

    {#if stackTrace}
      <details style="background:{T.surface};border-left:4px solid {T.negative};padding:16px;border-radius:8px;">
        <summary style="font-size:16px;font-weight:600;cursor:pointer;color:{T.ink};">
          Stack Trace
        </summary>
        <pre style="white-space:pre-wrap;word-break:break-words;font-size:13px;margin-top:8px;padding:8px;background:{T.pageDeep};color:{T.ink};border-radius:6px;font-family:{T.fontMono};">{stackTrace}</pre>
      </details>
    {/if}
  </div>
</div>
