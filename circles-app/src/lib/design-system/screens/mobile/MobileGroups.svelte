<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import AvatarStack from '../../AvatarStack.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Money from '../../Money.svelte';
  import MobileShell from '../../MobileShell.svelte';
  import MobileHeader from '../../MobileHeader.svelte';

  const groups = CirclesData.groups;
  const joined = groups.filter(g => g.joined);
  const px = 18;
</script>

<MobileShell active="groups">
  {#snippet header()}
    <MobileHeader>
      {#snippet leading()}
        <div style="display:flex;flex-direction:column;gap:0;">
          <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;line-height:1;">Groups</span>
          <span style="font-size:11.5px;color:{T.inkMuted};">5 joined · 2.4k discoverable</span>
        </div>
      {/snippet}
      {#snippet trailing()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.primary};border:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
          <Icon name="plus" size={16} stroke="#fff" strokeWidth={2.2} />
        </button>
      {/snippet}
    </MobileHeader>
  {/snippet}

  <div style="padding:4px {px}px 0;">
    <!-- Featured -->
    <div style="
      padding:20px;border-radius:24px;margin-top:6px;
      background:linear-gradient(120deg,{T.lilacSoft} 0%,{T.coralSoft} 70%,{T.butterSoft} 100%);
    ">
      <Pill color="ink">Featured</Pill>
      <h3 style="margin:10px 0 4px;font-family:{T.fontDisplay};font-size:28px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;line-height:1.1;">Berlin Mutual Aid</h3>
      <p style="margin:0;font-size:13px;color:{T.inkBody};line-height:1.45;">1,284 members across Kreuzberg, Neukölln &amp; Wedding.</p>
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px;">
        <AvatarStack seeds={['lina','kasper','paul']} size={24} />
        <span style="font-size:12px;color:{T.inkBody};flex:1;"><b>lina</b> +1.2k members</span>
        <Button variant="primary" size="sm" icon="plus">Join</Button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div style="display:flex;align-items:center;gap:6px;margin-top:18px;overflow-x:auto;padding-bottom:4px;">
      {#each ['My groups','Following','Discover'] as t, i}
        <button style="
          padding:7px 14px;border-radius:9999px;
          background:{i===0 ? T.ink : T.surface};
          color:{i===0 ? '#fff' : T.inkBody};
          border:{i===0 ? 'none' : `1px solid ${T.hairline}`};
          font-size:12.5px;font-weight:580;cursor:pointer;flex:0 0 auto;
        ">{t}</button>
      {/each}
    </div>

    <!-- Group list -->
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
      {#each joined as g}
        <div style="padding:14px;border-radius:18px;background:{T.surface};border:1px solid {T.hairlineSoft};display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;background:{g.gradient};display:flex;align-items:center;justify-content:center;">
            <Icon name="groups" size={18} stroke={T.ink} strokeWidth={1.8} />
          </div>
          <div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;">
            <span style="font-size:14px;font-weight:580;color:{T.ink};">{g.name}</span>
            <span style="font-size:11.5px;color:{T.inkMuted};">{g.members.toLocaleString()} members · {g.symbol}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:1px;align-items:flex-end;">
            <Money value={g.balance} size={13} weight={580} />
            <span style="font-size:10.5px;color:{T.inkMuted};">balance</span>
          </div>
        </div>
      {/each}
    </div>
    <div style="height:16px;"></div>
  </div>
</MobileShell>
