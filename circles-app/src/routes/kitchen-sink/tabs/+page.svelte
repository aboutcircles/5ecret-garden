<script lang="ts">
  import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
  import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
  import { T } from '$lib/design-system/tokens';

  let selectedMain = $state<string | null>('overview');
  let selectedBordered = $state<string | null>('a');
  let selectedMany = $state<string | null>('tab-1');

  const manyTabs = Array.from({ length: 30 }, (_, i) => ({
    id: `tab-${i + 1}`,
    title: `Tab ${i + 1}`
  }));
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Tabs</h2>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Boxed variant</h3>
    <Tabs bind:selected={selectedMain} variant="boxed" size="sm">
      <Tab id="overview" title="Overview" badge="1">
        <p style="font-size:13px;color:{T.inkMuted};margin:0;">Boxed tabs with badge + panel content.</p>
      </Tab>
      <Tab id="details" title="Details">
        <p style="font-size:13px;color:{T.inkMuted};margin:0;">Second panel to verify switching behavior.</p>
      </Tab>
      <Tab id="disabled" title="Disabled" disabled={true}>
        <p style="font-size:13px;color:{T.inkMuted};margin:0;">Disabled tab panel.</p>
      </Tab>
    </Tabs>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Bordered variant</h3>
    <Tabs bind:selected={selectedBordered} variant="bordered" size="sm">
      <Tab id="a" title="Bordered A" panelClass="pt-2">
        <div style="font-size:11.5px;color:{T.inkMuted};">Compact state A.</div>
      </Tab>
      <Tab id="b" title="Bordered B" panelClass="pt-2">
        <div style="font-size:11.5px;color:{T.inkMuted};">Compact state B.</div>
      </Tab>
    </Tabs>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">High-count row (1–30)</h3>
    <Tabs bind:selected={selectedMany} variant="boxed" size="sm">
      {#each manyTabs as t (t.id)}
        <Tab id={t.id} title={t.title} panelClass="pt-2">
          <div style="font-size:11.5px;color:{T.inkMuted};">Selected {t.title} in high-count tabs row.</div>
        </Tab>
      {/each}
    </Tabs>
  </div>
</section>
