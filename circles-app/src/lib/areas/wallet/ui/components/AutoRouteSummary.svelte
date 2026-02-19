<script lang="ts">
  import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
</script>

<div class="flex items-center gap-3 min-w-0">
  <div class="w-10 h-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
    <img src="/sparkles.svg" alt="Auto route" class="w-4 h-4 opacity-80" />
  </div>
  <div class="min-w-0">
    <div class="flex items-center gap-1.5">
      <span class="font-medium">Auto route</span>
      <HelpPopover
        title="Auto route"
        lines={[
          'Uses your trust network to deliver the payment.',
          'Routing can change which Circles you hold — not how many.',
        ]}
        widthClass="w-72"
      />
    </div>
    <div class="text-xs text-base-content/70">Uses your trust network</div>
  </div>
</div>
