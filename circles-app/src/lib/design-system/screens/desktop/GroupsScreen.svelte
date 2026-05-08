<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import AvatarStack from '../../AvatarStack.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import Tabs from '../../Tabs.svelte';
  import Money from '../../Money.svelte';

  const groups = CirclesData.groups;
  let tab = $state('mine');
</script>

<div style="display:flex;flex-direction:column;gap:20px;">
  <div style="display:flex;align-items:center;gap:10px;">
    <Tabs value={tab} onchange={(id) => tab = id} items={[
      {id:'mine',label:'My groups',count:5},
      {id:'following',label:'Following'},
      {id:'discover',label:'Discover',count:2400}
    ]} />
    <div style="flex:1;"></div>
    <Button variant="secondary" size="sm" icon="filter">Sort: Activity</Button>
    <Button variant="primary" size="sm" icon="plus">Create group</Button>
  </div>

  <!-- Featured group card -->
  <Card padding={0} style="overflow:hidden;">
    <div style="
      padding: 32px 36px 28px;
      background: linear-gradient(120deg, {T.lilacSoft} 0%, {T.coralSoft} 70%, {T.butterSoft} 100%);
      position: relative;
    ">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="display:flex;flex-direction:column;gap:8px;max-width:520px;">
          <Pill color="ink">Featured this week</Pill>
          <h2 style="margin:0;font-family:{T.fontDisplay};font-size:42px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;line-height:1.05;">Berlin Mutual Aid</h2>
          <p style="margin:0;font-size:14.5px;color:{T.inkBody};line-height:1.5;">
            A group currency backed by 1,284 members across Kreuzberg, Neukölln &amp; Wedding. Mint groceries, repair tools, childcare hours.
          </p>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <AvatarStack seeds={['lina','kasper','paul','mia']} size={28} />
            <span style="font-size:12.5px;color:{T.inkBody};"><b>lina, kasper</b> and 1,282 others</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;">
          <Button variant="primary" size="md" icon="plus">Join group</Button>
          <Money value={284123.40} size={18} weight={600} />
          <span style="font-size:11.5px;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;font-weight:580;">Group supply</span>
        </div>
      </div>
    </div>
  </Card>

  <!-- Group grid -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
    {#each groups as g}
      <Card padding={0} style="overflow:hidden;">
        <div style="height:76px;background:{g.gradient};position:relative;display:flex;align-items:flex-end;padding:0 16px 12px;">
          <div style="position:absolute;left:16px;bottom:-16px;width:48px;height:48px;border-radius:50%;background:{T.primaryFaint};display:flex;align-items:center;justify-content:center;">
            <Icon name="groups" size={22} stroke={T.primary} strokeWidth={1.8} />
          </div>
          {#if g.joined}
            <Pill color="sage" style="position:absolute;right:14px;top:14px;">Member</Pill>
          {/if}
        </div>
        <div style="padding:24px 18px 18px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
              <div style="display:flex;flex-direction:column;gap:1px;flex:1;">
                <span style="font-size:15px;font-weight:600;color:{T.ink};letter-spacing:-0.005em;">{g.name}</span>
                <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">{g.symbol}</span>
              </div>
              <Money value={g.balance} size={13} weight={580} />
            </div>
            <p style="margin:0;font-size:12.5px;color:{T.inkBody};line-height:1.4;">{g.description}</p>
            <div style="display:flex;align-items:center;gap:10px;margin-top:8px;padding-top:12px;border-top:1px solid {T.hairlineSoft};">
              <div style="display:flex;flex-direction:column;gap:0;">
                <span style="font-size:11px;color:{T.inkMuted};font-weight:580;letter-spacing:0.04em;text-transform:uppercase;">Members</span>
                <span style="font-size:13px;font-weight:580;color:{T.ink};font-variant-numeric:tabular-nums;">{g.members.toLocaleString()}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:0;">
                <span style="font-size:11px;color:{T.inkMuted};font-weight:580;letter-spacing:0.04em;text-transform:uppercase;">Volume / wk</span>
                <span style="font-size:13px;font-weight:580;color:{T.ink};font-variant-numeric:tabular-nums;">{g.weekVolume.toLocaleString()}</span>
              </div>
              <div style="flex:1;"></div>
              <button style="width:28px;height:28px;border-radius:8px;background:{T.surface};border:1px solid {T.hairline};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><Icon name="chevronRight" size={14} stroke={T.inkBody} /></button>
            </div>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</div>
