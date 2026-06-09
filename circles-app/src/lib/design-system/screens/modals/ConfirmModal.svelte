<script lang="ts">
  import { T } from '../../tokens.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';

  interface Props { desktop?: boolean; }
  let { desktop }: Props = $props();

  const details = [
    ['Network', 'Gnosis Chain · L2', null],
    ['Hops',    '2',                 'instant'],
    ['Gas',     '≈ €0.003',          'sponsored'],
    ['Memo',    'thanks for the gear!', null],
  ];
</script>

<div style="display:flex;flex-direction:column;gap:{desktop ? 18 : 14}px;">
  {#if !desktop}
    <div style="display:flex;flex-direction:column;gap:2px;align-items:center;margin-top:4px;">
      <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;">Sign to send</span>
      <span style="font-size:12.5px;color:{T.inkMuted};">Final review · won't be undoable</span>
    </div>
  {/if}

  <!-- Big dark card -->
  <div style="padding:24px 22px;border-radius:22px;background:{T.ink};color:#fff;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,{T.primary}55 0%,transparent 70%);"></div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.06em;text-transform:uppercase;">Sending</span>
      <div style="display:flex;align-items:baseline;gap:10px;">
        <span style="font-family:{T.fontDisplay};font-size:56px;color:#fff;letter-spacing:-0.025em;line-height:1;font-weight:400;">42.00</span>
        <span style="font-size:16px;font-weight:500;color:rgba(255,255,255,0.7);">CRC</span>
      </div>
      <span style="font-size:12px;color:rgba(255,255,255,0.55);font-family:{T.fontMono};">≈ €38.22</span>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.12);margin:18px 0;"></div>
    <div style="display:flex;align-items:center;gap:14px;">
      <Avatar seed="shorn" size={36} />
      <div style="flex:1;">
        <svg width="100%" height="20" viewBox="0 0 200 20" preserveAspectRatio="none">
          <line x1="0" y1="10" x2="200" y2="10" stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-dasharray="3 4" />
          <circle cx="60" cy="10" r="4" fill={T.coral} />
          <circle cx="140" cy="10" r="4" fill={T.lilac} />
        </svg>
      </div>
      <Avatar seed="paul" size={36} />
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 2px;">
      <span style="font-size:11px;color:rgba(255,255,255,0.6);">you</span>
      <span style="font-size:11px;color:rgba(255,255,255,0.6);">via lina, kasper</span>
      <span style="font-size:11px;color:rgba(255,255,255,0.6);">paul</span>
    </div>
  </div>

  <!-- Detail rows -->
  <div style="background:{T.surfaceAlt};border-radius:14px;border:1px solid {T.hairlineSoft};overflow:hidden;">
    {#each details as [k,v,sub], i}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:{i<details.length-1?`1px solid ${T.hairlineSoft}`:'none'};">
        <span style="font-size:12.5px;color:{T.inkMuted};">{k}</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12.5px;color:{T.ink};font-weight:540;">{v}</span>
          {#if sub}<Pill color="sage">{sub}</Pill>{/if}
        </div>
      </div>
    {/each}
  </div>

  <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
    <Button variant="ghost" full>Edit</Button>
    <Button variant="primary" full iconRight="arrowRight">Hold to sign</Button>
  </div>
</div>
