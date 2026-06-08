<script lang="ts">
  import { settings } from '$lib/shared/state/settings.svelte';
  import Tooltip from '$lib/shared/ui/primitives/Tooltip.svelte';
  import { T } from '$lib/design-system/tokens.js';
</script>

<details style="position:relative;display:inline-block;">
  <summary style="
    width:28px;height:28px;border-radius:9999px;border:0;
    background:transparent;cursor:pointer;
    display:inline-flex;align-items:center;justify-content:center;
    list-style:none;
  ">
    <img src="/setting.svg" alt="settings" style="width:18px;height:18px;" />
  </summary>
  <div style="
    position:absolute;right:0;top:calc(100% + 6px);
    z-index:50;width:180px;
    background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
    box-shadow:{T.shadow.xs};padding:10px 12px;
    display:flex;flex-direction:column;gap:8px;
  ">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
      <input
        type="checkbox"
        style="accent-color:{T.primary};width:14px;height:14px;cursor:pointer;"
        checked={settings.legacy}
        onchange={() => (settings.legacy = !settings.legacy)}
      />
      <span style="font-size:12.5px;color:{T.ink};">LEGACY</span>
      <Tooltip content="Use your EOA to control your avatar." />
    </label>
  </div>
</details>

<style>
  summary::-webkit-details-marker { display: none; }
</style>
