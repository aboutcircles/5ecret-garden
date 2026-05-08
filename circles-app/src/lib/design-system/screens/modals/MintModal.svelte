<script lang="ts">
  import { T } from '../../tokens.js';
  import Icon from '../../Icon.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';

  interface Props { desktop?: boolean; }
  let { desktop }: Props = $props();
</script>

<div style="display:flex;flex-direction:column;gap:{desktop ? 20 : 16}px;">
  <!-- Hero -->
  <div style="
    position:relative;border-radius:26px;padding:36px 22px 28px;
    background:radial-gradient(140% 100% at 50% 100%,{T.coral} 0%,{T.lilac} 50%,{T.primaryDeep} 100%);
    color:#fff;text-align:center;overflow:hidden;
  ">
    <!-- Sun rays -->
    <svg style="position:absolute;top:-120px;left:50%;transform:translateX(-50%);opacity:0.18;" width="600" height="600" viewBox="-100 -100 200 200">
      {#each Array.from({length:24}) as _, i}
        <line x1="0" y1="0" x2="0" y2="100" transform="rotate({(i/24)*360})" stroke="#fff" stroke-width="1" />
      {/each}
      <circle r="40" fill="rgba(255,255,255,0.12)" />
    </svg>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;">
      <Pill color="ink" style="background:rgba(0,0,0,0.25);color:#FBE3D8;">Daily mint</Pill>
      <span style="font-family:{T.fontDisplay};font-size:84px;line-height:1;color:#fff;letter-spacing:-0.03em;font-weight:400;margin-top:6px;">146.91</span>
      <span style="font-size:13px;color:rgba(255,255,255,0.85);font-family:{T.fontMono};">CRC accrued since 17:42 yesterday</span>
    </div>
  </div>

  <!-- Info box -->
  <div style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:{T.butterSoft};border:1px solid {T.butter}55;">
    <div style="display:flex;align-items:center;gap:10px;">
      <Icon name="info" size={14} stroke="#7B5215" />
      <span style="font-size:11.5px;font-weight:580;color:#7B5215;letter-spacing:0.04em;text-transform:uppercase;">How this works</span>
    </div>
    <span style="font-size:12.5px;color:{T.inkBody};line-height:1.55;">
      Every Circles wallet mints <b>1 CRC per hour</b>, capped at 24/day. Mint as often as you like — the longer you wait, the more accrues. Skip a day and the unminted amount is lost.
    </span>
  </div>

  <!-- Streak -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:{T.surfaceAlt};border-radius:12px;border:1px solid {T.hairlineSoft};">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:32px;height:32px;border-radius:9px;background:{T.coralSoft};display:flex;align-items:center;justify-content:center;">
        <Icon name="flame" size={15} stroke={T.coral} strokeWidth={2} />
      </div>
      <div style="display:flex;flex-direction:column;gap:0;">
        <span style="font-size:13px;font-weight:580;color:{T.ink};">14-day streak</span>
        <span style="font-size:11.5px;color:{T.inkMuted};">Mint daily to keep it going</span>
      </div>
    </div>
    <Pill color="coral">+ 14 today</Pill>
  </div>

  <Button variant="primary" full icon="sparkle" style="height:56px;font-size:16px;">Mint 146.91 CRC</Button>
  <span style="font-size:11px;color:{T.inkSubtle};text-align:center;margin-top:-6px;">Gas-free · settled in &lt; 1s</span>
</div>
