<script lang="ts">
  import SelectLbpAsset from '$lib/components/SelectLBPAsset.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { onMount } from 'svelte';

  let groupSelectValue = $state('');
  let groupAddressInput = $state('');

  let assetSelectValue = $state('0xaf204776c7245bf4147c2612bf6e5972ee483701'); // Default to sDAI placeholder
  let assetAddressInput = $state('');
  let assetName = $state('');
  let assetPrice = $state('');
  let assetAmountLabel = $state('Asset Amount (sDAI):');

  let groupAmount = $state(480);
  let groupPrice = $state(0.02);
  let assetAmount = $state(1000);

  let advancedParamsVisible = $state(false);
  let groupInitWeight = $state(80);
  let groupFinalWeight = $state(20);
  let swapFee = $state(1);
  let updateWeightDuration = $state(86400);

  // For price sync logic (using mock/placeholder values)
  let lastEditedField: 'groupPrice' | 'assetAmount' | 'groupAmount' | null =
    $state(null);
  let assetPriceInWxDAI: number | null = $state(null); // Placeholder
  let wxDAIPriceUSD: number | null = $state(null); // Placeholder

  // Reactive state for dynamic buttons (controlled by UI logic)
  let showCreateLBPButton = $state(false);

  // Placeholder variables for button handlers (will hold mock data or be unused in UI phase)
  let currentAssetAddressForButtons: string = $state('');
  let currentAssetAmountResultForButtons: number = $state(0);
  let currentBalanceAssetForButtons: number = $state(0);
  let currentGroupAmountResultForButtons: number = $state(0);
  let currentBalanceGroupForButtons: number = $state(0);

  // DOM element references (needed for style manipulation based on original script)
  let groupSelectEl: HTMLSelectElement;
  let assetSelectEl: HTMLSelectElement;
  let groupAddressInputEl: HTMLInputElement;
  let assetAddressInputEl: HTMLInputElement;

  async function handleSendAssetClick(
    starterAddress: string,
    asset: string,
    assetAmountResult: number,
    balanceAsset: number
  ) {
    // --- STUB: Replace with actual blockchain call to send asset ---
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Simulate successful send and update status
    await checkStarterStatus(starterAddress); // Re-check status with mock data
  }

  async function showNewStarterStatus(newStarterAddress: string) {
    await checkStarterStatus(newStarterAddress); // Call stubbed status check
  }

  async function handleLbpFormSubmit(e: Event) {
    e.preventDefault();

    // Get form values (using current state variables)
    const currentGroupAddr = getCurrentGroupAddress();
    const currentAssetAddr = getCurrentAssetAddress();
    const groupAmountVal = groupAmount;
    const assetAmountVal = assetAmount;
    const groupInitWeightVal = groupInitWeight;
    const groupFinalWeightVal = groupFinalWeight;
    const swapFeeVal = swapFee;
    const updateWeightDurationVal = updateWeightDuration;

    console.log('STUB: Creating LBP Starter with:', {
      group: currentGroupAddr,
      asset: currentAssetAddr,
      groupAmount: groupAmountVal,
      assetAmount: assetAmountVal,
      advanced: advancedParamsVisible
        ? {
            groupInitWeight: groupInitWeightVal,
            groupFinalWeight: groupFinalWeightVal,
            swapFee: swapFeeVal,
            updateWeightDuration: updateWeightDurationVal,
          }
        : 'default',
    });

    // --- STUB: Replace with actual blockchain call to create LBP Starter ---
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate transaction time

    // Simulate successful creation
    const simulatedNewStarterAddress = '0x...SimulatedNewStarter';
    await showNewStarterStatus(simulatedNewStarterAddress); // Show status with mock data
  }

  // --- Placeholder/Mock Data Fetching Functions ---

  async function fetchWxDAIPriceUSD() {
    // Placeholder: Simulate fetching price
    await new Promise((resolve) => setTimeout(resolve, 100));
    wxDAIPriceUSD = 1.0; // Mock price
  }

  function getAssetPriceUSD() {
    // Placeholder: Simulate getting asset price
    if (!assetPriceInWxDAI || !wxDAIPriceUSD) return null;
    return assetPriceInWxDAI * wxDAIPriceUSD;
  }

  // Price sync logic (using placeholder numbers)
  function updateAssetAmountFromGroupPrice() {
    const ga = parseFloat(String(groupAmount)) || 0;
    const gp = parseFloat(String(groupPrice)) || 0;
    const apUSD = getAssetPriceUSD();
    if (!apUSD || apUSD === 0) return;
    const aa = (ga * gp) / (apUSD * 0.01);
    assetAmount = aa ? parseFloat(aa.toFixed(6)) : 0;
  }

  function updateGroupPriceFromAssetAmount() {
    const ga = parseFloat(String(groupAmount)) || 0;
    const aa = parseFloat(String(assetAmount)) || 0;
    const apUSD = getAssetPriceUSD();
    if (!apUSD || apUSD === 0 || ga === 0) return;
    const gp = (aa * apUSD * 0.01) / ga;
    groupPrice = gp ? parseFloat(gp.toFixed(6)) : 0;
  }

  async function recalcOnPriceUpdate() {
    await fetchWxDAIPriceUSD(); // Fetch mock price
    if (lastEditedField === 'assetAmount') {
      updateGroupPriceFromAssetAmount();
    } else {
      updateAssetAmountFromGroupPrice();
    }
  }

  async function fetchAssetPriceInWxDAI_local(assetAddress: string) {
    // Placeholder: Simulate fetching asset price
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!assetAddress) {
      assetPrice = '';
      assetPriceInWxDAI = null;
      return;
    }
    assetPriceInWxDAI = 0.9; // Mock price
    assetPrice = `1 asset ≈ ${assetPriceInWxDAI.toFixed(6)} wxDAI (Mock)`;
    await recalcOnPriceUpdate();
  }

  function getCurrentAssetAddress() {
    if (assetSelectValue === 'custom') {
      return assetAddressInput;
    } else {
      return assetSelectValue;
    }
  }

  async function updateAssetNameUI() {
    const assetAddr = getCurrentAssetAddress();
    await fetchAndShowAssetName(assetAddr, 'assetNameSvelte', true); // Use new ID
    await fetchAssetPriceInWxDAI_local(assetAddr); // Fetch mock price
  }

  function getCurrentGroupAddress() {
    if (groupSelectValue === 'custom') {
      return groupAddressInput;
    } else {
      return groupSelectValue;
    }
  }

  async function fetchAndShowAssetName(
    address: string,
    targetIdSvelte: string,
    updateAmountLabel = true
  ) {
    if (!address) {
      if (targetIdSvelte === 'assetNameSvelte') assetName = '';
      else if (targetIdSvelte === 'statusAssetNameSvelte') {
        /* update specific status span if needed */
      }
      if (updateAmountLabel) assetAmountLabel = 'Asset Amount:';
      return;
    }
    // Placeholder: Simulate fetching and showing asset name
    await new Promise((resolve) => setTimeout(resolve, 100));
    const mockAssetName = 'Mock Asset';
    const mockAssetSymbol = address.substring(0, 6) + '...';
    const displayValue = `Token: ${mockAssetName} (${mockAssetSymbol})`;
    if (targetIdSvelte === 'assetNameSvelte') assetName = displayValue;
    else if (targetIdSvelte === 'statusAssetNameSvelte') {
      const el = document.getElementById('statusAssetNameSvelte');
      if (el) el.textContent = displayValue;
    }

    if (updateAmountLabel)
      assetAmountLabel = `Asset Amount (${mockAssetSymbol}):`;
  }

  // --- Stubbed/Placeholder Status Check Function ---

  async function checkStarterStatus(address: string) {
    // This is a stubbed function for UI demonstration
    // In a real implementation, this would make a blockchain call to check the status
    console.log(`STUB: Checking status for address: ${address}`);

    // Simulate different statuses based on address
    if (address === '0xDeadDeadDeadDeadDeadDeadDeadDeadDeadDeadDead') {
      showCreateLBPButton = true;
      return;
    }

    // Simulate a successful status with mock data
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Enable appropriate buttons based on mock data
    showCreateLBPButton = false;

    // Set values for send buttons (these would be real data in production)
    currentAssetAddressForButtons =
      '0xaf204776c7245bf4147c2612bf6e5972ee483701'; // sDAI
    currentAssetAmountResultForButtons = 1000; // Mock amount
    currentBalanceAssetForButtons = 5000; // Mock balance
    currentGroupAmountResultForButtons = 480; // Mock amount
    currentBalanceGroupForButtons = 1000; // Mock balance
  }

  // --- Initialization ---

  onMount(async () => {
    // Bind HTML elements for style manipulation (less ideal in Svelte, but part of original logic)
    groupSelectEl = document.getElementById(
      'groupSelectSvelte'
    ) as HTMLSelectElement;
    assetSelectEl = document.getElementById(
      'assetSelectSvelte'
    ) as HTMLSelectElement;
    groupAddressInputEl = document.getElementById(
      'groupAddressSvelte'
    ) as HTMLInputElement;
    assetAddressInputEl = document.getElementById(
      'assetAddressSvelte'
    ) as HTMLInputElement;

    // Initial data fetch (using placeholders)
    await fetchWxDAIPriceUSD();
    await updateAssetNameUI(); // Initial call for default asset

    // Initial sync of price/amount
    if (assetAmount) {
      // if assetAmount has an initial value
      lastEditedField = 'assetAmount';
      updateGroupPriceFromAssetAmount();
    } else if (groupPrice) {
      // if groupPrice has an initial value
      lastEditedField = 'groupPrice';
      updateAssetAmountFromGroupPrice();
    }
  });

  // Svelte's reactive updates for input changes
  $effect(() => {
    if (groupAmount && groupPrice && lastEditedField === 'groupPrice') {
      updateAssetAmountFromGroupPrice();
    }
  });
  $effect(() => {
    if (groupAmount && assetAmount && lastEditedField === 'assetAmount') {
      updateGroupPriceFromAssetAmount();
    }
  });
  $effect(() => {
    // When group amount changes
    if (lastEditedField === 'assetAmount') {
      updateGroupPriceFromAssetAmount();
    } else {
      // Default to updating asset amount, or if groupPrice was last edited
      updateAssetAmountFromGroupPrice();
    }
  });
</script>

<div class="flex flex-col items-center w-full max-w-4xl gap-y-6 mt-20">
  <h1 class="text-2xl font-bold mb-2">LBP Starter</h1>
  <p class="text-gray-600 mb-6">
    Create and manage Liquidity Bootstrapping Pools
  </p>

  <form onsubmit={handleLbpFormSubmit} class="w-full">
    <div class="form-group mb-6 flex flex-col gap-y-2">
      <SelectLbpAsset
        asset={{
          address: avatarState.avatar?.avatarInfo?.tokenId ?? '',
          name: avatarState.avatar?.avatarInfo?.name ?? '',
        }}
        disabled={true}
        bind:amount={groupAmount}
      />
      <SelectLbpAsset bind:amount={assetAmount} />
    </div>

    <div class="form-group mb-6">
      <label
        for="groupPriceSvelte"
        class="block mb-1 text-sm font-medium text-gray-700"
        >Group Price (USD):</label
      >
      <input
        type="number"
        id="groupPriceSvelte"
        class="input input-bordered w-full"
        required
        step="any"
        bind:value={groupPrice}
        oninput={() => (lastEditedField = 'groupPrice')}
      />
    </div>

    <div class="advanced-toggle mb-6 text-center">
      <button
        type="button"
        class="btn btn-outline btn-primary btn-sm"
        onclick={() => (advancedParamsVisible = !advancedParamsVisible)}
      >
        {advancedParamsVisible ? 'Hide' : 'Show'} Advanced Parameters
      </button>
    </div>

    {#if advancedParamsVisible}
      <div class="advanced-params border-t pt-6 mt-6">
        <div class="form-group mb-6">
          <label
            for="groupInitWeightSvelte"
            class="block mb-1 text-sm font-medium text-gray-700"
            >Group Initial Weight (0-100):</label
          >
          <input
            type="number"
            id="groupInitWeightSvelte"
            class="input input-bordered w-full"
            min="0"
            max="100"
            bind:value={groupInitWeight}
          />
        </div>
        <div class="form-group mb-6">
          <label
            for="groupFinalWeightSvelte"
            class="block mb-1 text-sm font-medium text-gray-700"
            >Group Final Weight (0-100):</label
          >
          <input
            type="number"
            id="groupFinalWeightSvelte"
            class="input input-bordered w-full"
            min="0"
            max="100"
            bind:value={groupFinalWeight}
          />
        </div>
        <div class="form-group mb-6">
          <label
            for="swapFeeSvelte"
            class="block mb-1 text-sm font-medium text-gray-700"
            >Swap Fee (0-100):</label
          >
          <input
            type="number"
            id="swapFeeSvelte"
            class="input input-bordered w-full"
            min="0"
            max="100"
            bind:value={swapFee}
          />
        </div>
        <div class="form-group mb-6">
          <label
            for="updateWeightDurationSvelte"
            class="block mb-1 text-sm font-medium text-gray-700"
            >Update Weight Duration (in seconds):</label
          >
          <input
            type="number"
            id="updateWeightDurationSvelte"
            class="input input-bordered w-full"
            bind:value={updateWeightDuration}
          />
        </div>
      </div>
    {/if}

    <button type="submit" class="btn btn-primary"
      >Create LBP Starter (UI Only)</button
    >
  </form>

  <div id="starterStatusSvelte" class="mt-6">
    {#if showCreateLBPButton}
      <div class="mt-4">
        <button class="btn btn-secondary" onclick={() => {}}
          >Create LBP (UI Only)</button
        >
      </div>
    {/if}
  </div>
</div>
