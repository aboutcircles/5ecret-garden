<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import Tabs from '../../Tabs.svelte';
  import Money from '../../Money.svelte';

  const offers = CirclesData.offers;
  let tab = $state('all');
</script>

<div style="display:flex;flex-direction:column;gap:20px;">
  <div style="display:flex;align-items:center;gap:10px;">
    <Tabs value={tab} onchange={(id) => tab = id} items={[
      {id:'all',label:'All'},
      {id:'goods',label:'Goods'},
      {id:'services',label:'Services'},
      {id:'time',label:'Time'},
      {id:'saved',label:'Saved',count:3}
    ]} />
    <div style="flex:1;"></div>
    <div style="height:36px;padding:0 12px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:flex;align-items:center;gap:8px;width:240px;">
      <Icon name="search" size={14} stroke={T.inkMuted} />
      <input placeholder="Search offers" style="border:0;outline:none;background:transparent;flex:1;font-size:12.5px;" />
    </div>
    <Button variant="primary" size="sm" icon="plus">Post offer</Button>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
    {#each offers as o}
      <Card padding={0} style="overflow:hidden;">
        <div style="height:156px;background:{o.bg};position:relative;display:flex;align-items:flex-end;padding:14px;">
          <Pill color={o.kindColor} style="position:absolute;top:12px;left:12px;">{o.kind}</Pill>
          {#if o.featured}
            <Pill color="ink" style="position:absolute;top:12px;right:12px;">★ Featured</Pill>
          {/if}
          <div style="font-family:{T.fontDisplay};font-size:38px;color:{o.ink ?? '#fff'};letter-spacing:-0.02em;line-height:1;position:relative;">{o.glyph}</div>
        </div>
        <div style="padding:16px 18px 18px;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:14.5px;font-weight:600;color:{T.ink};letter-spacing:-0.005em;">{o.title}</span>
            <span style="font-size:12.5px;color:{T.inkMuted};line-height:1.4;">{o.subtitle}</span>
            <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
              <Avatar seed={o.seller} size={20} />
              <span style="font-size:12px;color:{T.inkBody};">{o.seller}</span>
              <span style="color:{T.inkFaint};">·</span>
              <span style="font-size:12px;color:{T.inkMuted};">{o.distance}</span>
            </div>
            <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:14px;padding-top:14px;border-top:1px solid {T.hairlineSoft};">
              <div style="display:flex;flex-direction:column;gap:1px;">
                <Money value={o.price} size={18} weight={600} />
                <span style="font-size:11px;color:{T.inkSubtle};font-family:{T.fontMono};">≈ €{Math.round(o.price * 0.91)}</span>
              </div>
              <Button variant="secondary" size="sm">View</Button>
            </div>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</div>
