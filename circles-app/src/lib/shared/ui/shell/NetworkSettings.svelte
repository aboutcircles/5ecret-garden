<script lang="ts">
  import { settings, updateSettings, resetSettings, type NetworkSettings } from '$lib/shared/state/settings.svelte';
  import type { NetworkType } from '$lib/shared/integrations/chain/chainConfig';

  let showAdvanced = $state(false);

  // Local state for form inputs
  let customCirclesRpcUrl = $state(settings.customCirclesRpcUrl ?? '');
  let customChainRpcUrl = $state(settings.customChainRpcUrl ?? '');
  let customProfileServiceUrl = $state(settings.customProfileServiceUrl ?? '');
  let customPathfinderUrl = $state(settings.customPathfinderUrl ?? '');

  function handleNetworkChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    updateSettings({ network: target.value as NetworkType });
  }

  function handleRingToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    updateSettings({ ring: target.checked });
  }

  function saveCustomUrls() {
    updateSettings({
      customCirclesRpcUrl: customCirclesRpcUrl || undefined,
      customChainRpcUrl: customChainRpcUrl || undefined,
      customProfileServiceUrl: customProfileServiceUrl || undefined,
      customPathfinderUrl: customPathfinderUrl || undefined,
    });
  }

  function clearCustomUrls() {
    customCirclesRpcUrl = '';
    customChainRpcUrl = '';
    customProfileServiceUrl = '';
    customPathfinderUrl = '';
    updateSettings({
      customCirclesRpcUrl: undefined,
      customChainRpcUrl: undefined,
      customProfileServiceUrl: undefined,
      customPathfinderUrl: undefined,
    });
  }

  function handleReset() {
    resetSettings();
    customCirclesRpcUrl = '';
    customChainRpcUrl = '';
    customProfileServiceUrl = '';
    customPathfinderUrl = '';
  }
</script>

<div class="card bg-base-100 shadow-sm">
  <div class="card-body gap-4">
    <h3 class="card-title text-lg">Network Settings</h3>

    <!-- Network Selection -->
    <div class="form-control w-full">
      <label class="label" for="network-select">
        <span class="label-text">Network</span>
      </label>
      <select
        id="network-select"
        class="select select-bordered w-full"
        value={settings.network}
        onchange={handleNetworkChange}
      >
        <option value="gnosis">Gnosis (Production)</option>
        <option value="chiado">Chiado (Testnet)</option>
      </select>
      <label class="label">
        <span class="label-text-alt text-base-content/60">
          {settings.network === 'gnosis' ? 'Main network with real CRC tokens' : 'Test network for development'}
        </span>
      </label>
    </div>

    <!-- Rings Toggle -->
    <div class="form-control">
      <label class="label cursor-pointer justify-start gap-3" for="rings-toggle">
        <input
          id="rings-toggle"
          type="checkbox"
          class="toggle toggle-primary"
          checked={settings.ring}
          onchange={handleRingToggle}
        />
        <div class="flex flex-col">
          <span class="label-text">Enable Rings</span>
          <span class="label-text-alt text-base-content/60">
            Experimental contract addresses
          </span>
        </div>
      </label>
    </div>

    <!-- Advanced Settings Toggle -->
    <div class="divider my-0"></div>

    <button
      class="btn btn-ghost btn-sm justify-start gap-2"
      onclick={() => showAdvanced = !showAdvanced}
    >
      <svg
        class="w-4 h-4 transition-transform {showAdvanced ? 'rotate-90' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      Advanced Settings
    </button>

    {#if showAdvanced}
      <div class="space-y-4 animate-in fade-in duration-200">
        <p class="text-sm text-base-content/60">
          Override default URLs for custom RPC endpoints. Leave empty to use defaults.
        </p>

        <!-- Custom Circles RPC URL -->
        <div class="form-control w-full">
          <label class="label" for="circles-rpc-url">
            <span class="label-text">Circles RPC URL</span>
          </label>
          <input
            id="circles-rpc-url"
            type="url"
            class="input input-bordered w-full input-sm"
            placeholder="https://rpc.aboutcircles.com"
            bind:value={customCirclesRpcUrl}
          />
        </div>

        <!-- Custom Chain RPC URL -->
        <div class="form-control w-full">
          <label class="label" for="chain-rpc-url">
            <span class="label-text">Chain RPC URL</span>
          </label>
          <input
            id="chain-rpc-url"
            type="url"
            class="input input-bordered w-full input-sm"
            placeholder="https://rpc.gnosischain.com"
            bind:value={customChainRpcUrl}
          />
        </div>

        <!-- Custom Profile Service URL -->
        <div class="form-control w-full">
          <label class="label" for="profile-service-url">
            <span class="label-text">Profile Service URL</span>
          </label>
          <input
            id="profile-service-url"
            type="url"
            class="input input-bordered w-full input-sm"
            placeholder="https://rpc.aboutcircles.com/profiles/"
            bind:value={customProfileServiceUrl}
          />
        </div>

        <!-- Custom Pathfinder URL -->
        <div class="form-control w-full">
          <label class="label" for="pathfinder-url">
            <span class="label-text">Pathfinder URL</span>
          </label>
          <input
            id="pathfinder-url"
            type="url"
            class="input input-bordered w-full input-sm"
            placeholder="https://pathfinder.aboutcircles.com"
            bind:value={customPathfinderUrl}
          />
        </div>

        <div class="flex gap-2 justify-end">
          <button class="btn btn-ghost btn-sm" onclick={clearCustomUrls}>
            Clear Custom URLs
          </button>
          <button class="btn btn-primary btn-sm" onclick={saveCustomUrls}>
            Save URLs
          </button>
        </div>
      </div>
    {/if}

    <!-- Reset Button -->
    <div class="divider my-0"></div>
    <div class="flex justify-end">
      <button class="btn btn-ghost btn-sm text-error" onclick={handleReset}>
        Reset to Defaults
      </button>
    </div>
  </div>
</div>

<style>
  .animate-in {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
