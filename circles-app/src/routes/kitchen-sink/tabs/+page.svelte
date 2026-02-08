<script lang="ts">
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';

  let selectedMain = $state<string | null>('overview');
  let selectedBordered = $state<string | null>('a');
  let selectedMany = $state<string | null>('tab-1');

  const manyTabs = Array.from({ length: 30 }, (_, i) => ({
    id: `tab-${i + 1}`,
    title: `Tab ${i + 1}`
  }));
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Tabs</h2>

  <div class="space-y-2">
    <h3 class="font-medium">Boxed variant</h3>
    <Tabs bind:selected={selectedMain} variant="boxed" size="sm">
      <Tab id="overview" title="Overview" badge="1">
        <p class="text-sm opacity-80">Boxed tabs with badge + panel content.</p>
      </Tab>
      <Tab id="details" title="Details">
        <p class="text-sm opacity-80">Second panel to verify switching behavior.</p>
      </Tab>
      <Tab id="disabled" title="Disabled" disabled={true}>
        <p class="text-sm opacity-80">Disabled tab panel.</p>
      </Tab>
    </Tabs>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Bordered variant</h3>
    <Tabs bind:selected={selectedBordered} variant="bordered" size="sm">
      <Tab id="a" title="Bordered A" panelClass="pt-2">
        <div class="text-xs opacity-70">Compact state A.</div>
      </Tab>
      <Tab id="b" title="Bordered B" panelClass="pt-2">
        <div class="text-xs opacity-70">Compact state B.</div>
      </Tab>
    </Tabs>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">High-count row (1–30)</h3>
    <Tabs bind:selected={selectedMany} variant="boxed" size="sm">
      {#each manyTabs as t (t.id)}
        <Tab id={t.id} title={t.title} panelClass="pt-2">
          <div class="text-xs opacity-70">Selected {t.title} in high-count tabs row.</div>
        </Tab>
      {/each}
    </Tabs>
  </div>
</section>
