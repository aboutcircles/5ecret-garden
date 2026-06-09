<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Pill from '../../Pill.svelte';
  import Money from '../../Money.svelte';
  import MobileShell from '../../MobileShell.svelte';
  import MobileHeader from '../../MobileHeader.svelte';

  const offers = CirclesData.offers;
  const px = 18;
  const hero = offers[0];
  const grid = offers.slice(1, 5);
</script>

<MobileShell active="market">
  {#snippet header()}
    <MobileHeader>
      {#snippet leading()}
        <div style="display:flex;flex-direction:column;gap:0;">
          <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;line-height:1;">Market</span>
          <span style="font-size:11.5px;color:{T.inkMuted};">124 offers within 5km</span>
        </div>
      {/snippet}
      {#snippet trailing()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:{T.shadow.xs};">
          <Icon name="filter" size={16} stroke={T.inkBody} />
        </button>
      {/snippet}
    </MobileHeader>
  {/snippet}

  <div style="padding:4px {px}px 0;">
    <!-- Filter tabs -->
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;overflow-x:auto;padding-bottom:4px;">
      {#each ['All','Goods','Food','Services','Time','Events'] as t, i}
        <button style="
          padding:7px 14px;border-radius:9999px;flex:0 0 auto;
          background:{i===0 ? T.ink : T.surface};
          color:{i===0 ? '#fff' : T.inkBody};
          border:{i===0 ? 'none' : `1px solid ${T.hairline}`};
          font-size:12.5px;font-weight:580;cursor:pointer;
        ">{t}</button>
      {/each}
    </div>

    <!-- Hero offer -->
    <div style="margin-top:14px;border-radius:22px;overflow:hidden;background:{T.surface};border:1px solid {T.hairlineSoft};">
      <div style="height:160px;padding:16px;position:relative;background:{hero.bg};display:flex;align-items:flex-end;">
        <Pill color={hero.kindColor} style="position:absolute;top:12px;left:12px;">{hero.kind}</Pill>
        <Pill color="ink" style="position:absolute;top:12px;right:12px;">★ Featured</Pill>
        <span style="font-family:{T.fontDisplay};font-size:36px;color:#fff;letter-spacing:-0.02em;">{hero.glyph}</span>
      </div>
      <div style="padding:16px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:15.5px;font-weight:600;color:{T.ink};letter-spacing:-0.005em;">{hero.title}</span>
          <span style="font-size:12.5px;color:{T.inkMuted};">{hero.subtitle}</span>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <Avatar seed={hero.seller} size={20} />
              <span style="font-size:12px;color:{T.inkBody};">{hero.seller} · {hero.distance}</span>
            </div>
            <Money value={hero.price} size={17} weight={600} />
          </div>
        </div>
      </div>
    </div>

    <!-- 2-col grid -->
    <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      {#each grid as o}
        <div style="border-radius:16px;overflow:hidden;background:{T.surface};border:1px solid {T.hairlineSoft};">
          <div style="height:88px;padding:10px;position:relative;background:{o.bg};display:flex;align-items:flex-end;">
            <Pill color={o.kindColor} style="position:absolute;top:8px;left:8px;padding:2px 7px;font-size:10px;">{o.kind}</Pill>
            <span style="font-family:{T.fontDisplay};font-size:22px;color:{o.ink||'#fff'};letter-spacing:-0.02em;">{o.glyph}</span>
          </div>
          <div style="padding:10px 12px 12px;">
            <span style="font-size:13px;font-weight:580;color:{T.ink};display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{o.title}</span>
            <span style="font-size:11px;color:{T.inkMuted};display:block;margin-bottom:6px;">{o.seller}</span>
            <Money value={o.price} size={13} weight={600} />
          </div>
        </div>
      {/each}
    </div>
    <div style="height:16px;"></div>
  </div>
</MobileShell>
