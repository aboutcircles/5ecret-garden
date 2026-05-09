<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    title: string;
    message?: string;
    tone?: 'info' | 'success' | 'warning' | 'error';
    className?: string;
  }

  let { title, message = '', tone = 'info', className = '' }: Props = $props();

  const toneStyles = {
    info:    { bg: T.primaryFaint,  border: T.primary,   color: T.inkBody },
    success: { bg: T.positiveSoft,  border: T.positive,  color: T.inkBody },
    warning: { bg: T.warningSoft,   border: T.warning,   color: T.inkBody },
    error:   { bg: T.negativeSoft,  border: T.negative,  color: T.inkBody },
  } as const;

  const resolvedStyle = $derived(toneStyles[tone]);
</script>

<div style={`width:100%;display:flex;flex-direction:column;border-top:4px solid ${resolvedStyle.border};margin-bottom:16px;border-radius:0 0 6px 6px;padding:12px 16px;box-shadow:0 2px 6px rgba(15,10,30,0.06);background:${resolvedStyle.bg};color:${resolvedStyle.color};`}>
  <p style="font-weight:700;margin:0;">{title}</p>
  {#if message}
    <p style="font-size:14px;color:{T.inkMuted};margin:4px 0 0 0;">{message}</p>
  {/if}
</div>
