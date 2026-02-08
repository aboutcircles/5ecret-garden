<script lang="ts">
  import { settings } from '$lib/shared/state/settings.svelte';
  import Tooltip from './Tooltip.svelte';
</script>

<div class="dropdown dropdown-end">
  <div tabIndex={0} role="button" class="btn btn-ghost btn-circle btn-xs">
    <img src="/setting.svg" alt="setting" class="w-5 h-5 inline" />
  </div>
  <div
    tabIndex={0}
    class="dropdown-content bg-base-100 rounded-box z-[1] w-40 p-2 shadow flex flex-col gap-y-2"
  >
    <div class="flex items-center gap-x-2">
      <input
        type="checkbox"
        class="toggle toggle-sm"
        checked={settings.legacy}
        onchange={() => (settings.legacy = !settings.legacy)}
      />
      <p class="text-sm">LEGACY <Tooltip content="Use your EOA to control your avatar." /></p>
    </div>
  </div>
</div>
