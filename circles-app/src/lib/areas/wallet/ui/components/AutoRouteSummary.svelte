<script lang="ts">
  import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
  import { T } from '$lib/design-system/tokens.js';
</script>

<div style="display:flex;align-items:center;gap:12px;min-width:0;">
  <div style="width:40px;height:40px;border-radius:9999px;background:rgba(88,73,212,0.1);border:1px solid rgba(88,73,212,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <img src="/sparkles.svg" alt="Auto route" style="width:16px;height:16px;opacity:0.8;" />
  </div>
  <div style="min-width:0;">
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">Auto route</span>
      <HelpPopover
        title="Auto route"
        lines={[
          'Uses your trust network to deliver the payment.',
          'Routing can change which Circles you hold — not how many.',
        ]}
        widthClass="w-72"
      />
    </div>
    <div style="font-size:12px;color:{T.inkMuted};">Uses your trust network</div>
  </div>
</div>
