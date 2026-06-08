<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    label?: string;
  }

  let { label = 'Change' }: Props = $props();
</script>

<button type="button" style="border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-size:11px;padding:2px 8px;border-radius:9999px;font-family:{T.fontSans};">{label}</button>
