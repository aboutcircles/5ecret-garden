<script lang="ts">
  import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
  import { T } from '$lib/design-system/tokens';
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Misc</h2>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Disclaimer</h3>
    <Disclaimer />
  </div>
</section>
