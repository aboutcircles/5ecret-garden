<script lang="ts">
  import { settings } from '$lib/stores/settings.svelte';
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
        class="toggle toggle-sm checked:bg-orange-400 checked:text-orange-800"
        checked={settings.ring}
        onchange={() => (settings.ring = !settings.ring)}
      />
      <a
        href="https://docs.aboutcircles.com/developer-docs/getting-started-with-the-sdk#using-the-sandbox-version-of-circles-sdk-for-builders"
        target="_blank"
        class={`flex font-semibold items-center text-sm text-nowrap  transition-color duration-300 ease-in-out ${
          settings.ring
            ? 'text-orange-700'
            : 'text-primary hover:text-primary/80'
        }`}
      >
        RINGS<img
          src="/external.svg"
          alt="external icon"
          class="h-3 w-3 ml-1"
        />
      </a>
    </div>
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
