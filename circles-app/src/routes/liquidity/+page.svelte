<script lang="ts">
  import { onMount } from 'svelte';

  // Reactive state variables for UI and form data
  let existingStarterAddress = $state('');
  let existingStarterStatus = $state('Status will appear here...');

  let groupSelectValue = $state('');
  let groupAddressInput = $state('');
  let groupTokenName = $state('');

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

  let statusMessage = $state('Status messages will appear here...');
  let statusType = $state<'success' | 'error' | ''>(''); // '', 'success', or 'error'
  let starterStatusDisplay = $state('LBP Starter status will appear here...');

  let defaultGroups = $state<{ address: string; name: string }[]>([]); // Placeholder for default groups

  // For price sync logic (using mock/placeholder values)
  let lastEditedField: 'groupPrice' | 'assetAmount' | 'groupAmount' | null = $state(null);
  let assetPriceInWxDAI: number | null = $state(null); // Placeholder
  let wxDAIPriceUSD: number | null = $state(null); // Placeholder

  // Reactive state for dynamic buttons (controlled by UI logic)
  let showCreateLBPButton = $state(false);
  let showSendAssetButton = $state(false);
  let showSendGroupButton = $state(false);

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

  // --- UI Helper Functions (Adapted from original script) ---

  function formatEther(val: number | string) {
    // Placeholder: In real implementation, this would format BigNumber from ethers
    try { return Number(val).toFixed(4); } catch { return String(val); }
  }

  function getCowSwapLink(token: string, to: string, amount: string) {
    // Placeholder: In real implementation, this would generate a real CowSwap link
    return `https://swap.cow.fi/#/100/swap/${token}-${to}?sellAmountBeforeFee=${amount}`;
  }

  // --- Stubbed/Placeholder Blockchain Interaction Functions ---

  async function handleCreateLBPClick(starterAddress: string) {
    statusMessage = 'STUB: Creating LBP (blockchain interaction disabled)...';
    statusType = 'success';
    console.log(`STUB: Create LBP for Starter: ${starterAddress}`);
    // --- STUB: Replace with actual blockchain call to create LBP ---
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate transaction time
    statusMessage = 'STUB: LBP creation simulated!';
    statusType = 'success';
    // Simulate successful creation and update status
    await checkStarterStatus(starterAddress); // Re-check status with mock data
  }

  async function handleSendAssetClick(starterAddress: string, asset: string, assetAmountResult: number, balanceAsset: number) {
    statusMessage = 'STUB: Sending asset (blockchain interaction disabled)...';
    statusType = 'success';
    console.log(`STUB: Sending asset ${asset} to ${starterAddress}`);
    // --- STUB: Replace with actual blockchain call to send asset ---
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate transaction time
    statusMessage = 'STUB: Asset sent simulated!';
    statusType = 'success';
    // Simulate successful send and update status
    await checkStarterStatus(starterAddress); // Re-check status with mock data
  }

  async function handleExistingStarterForm(e: Event) {
    e.preventDefault();
    const addr = existingStarterAddress.trim();
    if (!addr) { // Simplified validation for UI phase
        existingStarterStatus = '<span style="color:red;">Please enter an address</span>';
        return;
    }
    // --- STUB: Replace with actual blockchain call validation ---
    console.log(`STUB: Validating address and checking status: ${addr}`);
    await checkStarterStatus(addr); // Call stubbed status check
  }

  async function showNewStarterStatus(newStarterAddress: string) {
    starterStatusDisplay = ''; // Clear previous
    await checkStarterStatus(newStarterAddress); // Call stubbed status check
  }

  async function handleLbpFormSubmit(e: Event) {
    e.preventDefault();
    starterStatusDisplay = ''; // Clear previous starter status
    statusMessage = 'STUB: Creating LBP Starter (blockchain interaction disabled)...';
    statusType = 'success';

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
        advanced: advancedParamsVisible ? {
            groupInitWeight: groupInitWeightVal,
            groupFinalWeight: groupFinalWeightVal,
            swapFee: swapFeeVal,
            updateWeightDuration: updateWeightDurationVal
        } : 'default'
    });

    // --- STUB: Replace with actual blockchain call to create LBP Starter ---
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction time

    // Simulate successful creation
    const simulatedNewStarterAddress = '0x...SimulatedNewStarter';
    statusMessage = `STUB: LBP Starter creation simulated! Address: ${simulatedNewStarterAddress}`;
    statusType = 'success';
    await showNewStarterStatus(simulatedNewStarterAddress); // Show status with mock data
  }

  // --- Placeholder/Mock Data Fetching Functions ---

  async function fetchWxDAIPriceUSD() {
    // Placeholder: Simulate fetching price
    await new Promise(resolve => setTimeout(resolve, 100));
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
    await new Promise(resolve => setTimeout(resolve, 100));
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

  function handleAssetSelectChange() {
    if (assetSelectEl) { // Check if element is bound
        assetAddressInputEl.style.display = assetSelectValue === 'custom' ? '' : 'none';
        assetAddressInputEl.required = assetSelectValue === 'custom';
    }
    updateAssetNameUI();
  }

  function getCurrentGroupAddress() {
    if (groupSelectValue === 'custom') {
        return groupAddressInput;
    } else {
        return groupSelectValue;
    }
  }

  async function updateGroupTokenNameUI() {
    const groupAddr = getCurrentGroupAddress();
    if (!groupAddr) {
        groupTokenName = '';
        return;
    }
    // Placeholder: Simulate fetching group token name
    await new Promise(resolve => setTimeout(resolve, 100));
    groupTokenName = `Token: Mock Group Token (${groupAddr.substring(0, 6)}...)`;
  }

  function handleGroupSelectChange() {
     if (groupSelectEl) { // Check if element is bound
        groupAddressInputEl.style.display = groupSelectValue === 'custom' ? '' : 'none';
        groupAddressInputEl.required = groupSelectValue === 'custom';
    }
    updateGroupTokenNameUI();
  }

  async function fetchDefaultGroups() {
    // Placeholder: Simulate fetching default groups
    await new Promise(resolve => setTimeout(resolve, 200));
    const mockGroups = [
        { address: '0x0afd8899bca011Bb95611409f09c8EFbf6b169cF', name: 'Mock Group 1' },
        { address: '0xabcdef1234567890abcdef1234567890abcdef', name: 'Mock Group 2' },
    ];
    // Return objects with address and mock name
    return mockGroups.map(g => ({ address: g.address, name: g.name }));
  }

  async function getGroupTokenNameLocal(address: string) {
    // Placeholder: Simulate fetching group token name
    await new Promise(resolve => setTimeout(resolve, 50));
    return `Mock Token (${address.substring(0, 6)}...)`;
  }

  async function populateGroupDropdown() {
    const fetchedGroups = await fetchDefaultGroups();
    defaultGroups = fetchedGroups; // Update reactive store

    // Fetch token names in parallel (using placeholder function)
    const namePromises = fetchedGroups.map(groupOption => getGroupTokenNameLocal(groupOption.address)); // Pass address property
    const names = await Promise.all(namePromises);

    // Populate dropdown options (Svelte template handles this)
    // Set the first group as selected if available
    if (fetchedGroups.length > 0) {
        groupSelectValue = fetchedGroups[0].address; // Use address property
    } else {
        groupSelectValue = 'custom';
    }
    await updateGroupTokenNameUI();
  }

  async function fetchAndShowGroupTokenName(groupAddress: string) {
    if (!groupAddress) {
        groupTokenName = '';
        return;
    }
    // Placeholder: Simulate fetching and showing group token name
    await new Promise(resolve => setTimeout(resolve, 100));
    groupTokenName = `Token: Mock Group Token (${groupAddress.substring(0, 6)}...)`;
  }

  async function fetchAndShowAssetName(address: string, targetIdSvelte: string, updateAmountLabel = true) {
    if (!address) {
        if (targetIdSvelte === 'assetNameSvelte') assetName = '';
        else if (targetIdSvelte === 'statusAssetNameSvelte') { /* update specific status span if needed */ }
        if (updateAmountLabel) assetAmountLabel = 'Asset Amount:';
        return;
    }
    // Placeholder: Simulate fetching and showing asset name
    await new Promise(resolve => setTimeout(resolve, 100));
    const mockAssetName = 'Mock Asset';
    const mockAssetSymbol = address.substring(0, 6) + '...';
    const displayValue = `Token: ${mockAssetName} (${mockAssetSymbol})`;
    if (targetIdSvelte === 'assetNameSvelte') assetName = displayValue;
    else if (targetIdSvelte === 'statusAssetNameSvelte') {
        const el = document.getElementById('statusAssetNameSvelte');
        if (el) el.textContent = displayValue;
     }

    if (updateAmountLabel) assetAmountLabel = `Asset Amount (${mockAssetSymbol}):`;
  }

  // --- Stubbed/Placeholder Status Check Function ---

  async function checkStarterStatus(address: string) {
    // This is a stubbed function for UI demonstration
    // In a real implementation, this would make a blockchain call to check the status
    console.log(`STUB: Checking status for address: ${address}`);

    // Simulate different statuses based on address
    if (address === '0xDeadDeadDeadDeadDeadDeadDeadDeadDeadDeadDead') {
      // Simulate a failed/empty status
      existingStarterStatus = '<span style="color:red;">No LBP Starter found at this address</span>';
      starterStatusDisplay = '<span style="color:red;">No LBP Starter found at this address</span>';
      showCreateLBPButton = true;
      showSendAssetButton = false;
      showSendGroupButton = false;
      return;
    }

    // Simulate a successful status with mock data
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

    existingStarterStatus = `<span style="color:green;">LBP Starter found!</span>`;
    starterStatusDisplay = `
      <div>
        <h4>LBP Starter Status:</h4>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Status:</strong> Active</p>
        <p><strong>Group Token:</strong> CRC (Mock)</p>
        <p><strong>Asset:</strong> sDAI (Mock)</p>
      </div>
    `;

    // Enable appropriate buttons based on mock data
    showCreateLBPButton = false;
    showSendAssetButton = true;
    showSendGroupButton = true;

    // Set values for send buttons (these would be real data in production)
    currentAssetAddressForButtons = '0xaf204776c7245bf4147c2612bf6e5972ee483701'; // sDAI
    currentAssetAmountResultForButtons = 1000; // Mock amount
    currentBalanceAssetForButtons = 5000; // Mock balance
    currentGroupAmountResultForButtons = 480; // Mock amount
    currentBalanceGroupForButtons = 1000; // Mock balance
  }

  // --- Initialization ---

  onMount(async () => {
    // Bind HTML elements for style manipulation (less ideal in Svelte, but part of original logic)
    groupSelectEl = document.getElementById('groupSelectSvelte') as HTMLSelectElement;
    assetSelectEl = document.getElementById('assetSelectSvelte') as HTMLSelectElement;
    groupAddressInputEl = document.getElementById('groupAddressSvelte') as HTMLInputElement;
    assetAddressInputEl = document.getElementById('assetAddressSvelte') as HTMLInputElement;

    // Initial data fetch (using placeholders)
    await fetchWxDAIPriceUSD();
    await populateGroupDropdown();
    await updateAssetNameUI(); // Initial call for default asset

    // Initial sync of price/amount
    if (assetAmount) { // if assetAmount has an initial value
        lastEditedField = 'assetAmount';
        updateGroupPriceFromAssetAmount();
    } else if (groupPrice) { // if groupPrice has an initial value
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
   $effect(() => { // When group amount changes
    if (lastEditedField === 'assetAmount') {
        updateGroupPriceFromAssetAmount();
    } else { // Default to updating asset amount, or if groupPrice was last edited
        updateAssetAmountFromGroupPrice();
    }
  });
</script>

<div class="flex flex-col items-center w-full max-w-4xl gap-y-6 mt-20">
  <h1 class="text-2xl font-bold mb-2">LBP Starter</h1>
  <p class="text-gray-600 mb-6">Create and manage Liquidity Bootstrapping Pools</p>

  <div class="bg-gray-100 p-6 rounded-xl border shadow-sm mb-6 w-full">
    <h3 class="text-xl font-semibold mb-4">Continue with Existing LBP Starter</h3>
    <form on:submit={handleExistingStarterForm} class="flex gap-x-4 items-end">
      <div class="flex-1">
        <label for="existingStarterAddressSvelte" class="block mb-1 text-sm font-medium text-gray-700">LBP Starter Address:</label>
        <input type="text" id="existingStarterAddressSvelte" placeholder="0x..." class="input input-bordered w-full" bind:value={existingStarterAddress} />
      </div>
      <button type="submit" class="btn btn-primary">Check Status</button>
    </form>
    <div id="existingStarterStatusSvelte" class="mt-4 text-sm text-gray-600">{@html existingStarterStatus}</div>
  </div>

  <form on:submit={handleLbpFormSubmit} class="w-full">
    <div class="form-group mb-6">
      <label for="groupSelectSvelte" class="block mb-1 text-sm font-medium text-gray-700">Group Address:</label>
      <select id="groupSelectSvelte" class="select select-bordered w-full" bind:value={groupSelectValue} on:change={handleGroupSelectChange}>
        {#each defaultGroups as groupOption}
          <option value={groupOption.address}>{groupOption.name}</option>
        {/each}
        <option value="custom">Custom...</option>
      </select>
      <input type="text" id="groupAddressSvelte" class="input input-bordered w-full mt-2" placeholder="Paste group address" bind:value={groupAddressInput} on:input={updateGroupTokenNameUI} required={groupSelectValue === 'custom'} />
      <div id="groupTokenNameSvelte" class="mt-2 text-xs text-gray-500">{groupTokenName}</div>
    </div>

    <div class="form-group mb-6">
      <label for="assetSelectSvelte" class="block mb-1 text-sm font-medium text-gray-700">Asset Address:</label>
      <select id="assetSelectSvelte" class="select select-bordered w-full" bind:value={assetSelectValue} on:change={handleAssetSelectChange}>
        <option value="0xaf204776c7245bf4147c2612bf6e5972ee483701">sDAI (Placeholder)</option>
        <option value="0x9c58bacc331c9aa871afd802db6379a98e80cedb">GNO (Placeholder)</option>
        <option value="custom">Custom...</option>
      </select>
      <input type="text" id="assetAddressSvelte" class="input input-bordered w-full mt-2" placeholder="Paste ERC20 address" bind:value={assetAddressInput} on:input={updateAssetNameUI} required={assetSelectValue === 'custom'} />
      <div id="assetNameSvelte" class="mt-2 text-xs text-gray-500">{assetName}</div>
      <div id="assetPriceSvelte" class="mt-2 text-xs text-gray-500">{assetPrice}</div>
    </div>

    <div class="form-group mb-6">
      <label for="groupAmountSvelte" class="block mb-1 text-sm font-medium text-gray-700">Group Amount (CRC):</label>
      <input type="number" id="groupAmountSvelte" class="input input-bordered w-full" required step="any" bind:value={groupAmount} on:input={() => lastEditedField = 'groupAmount'}>
    </div>

    <div class="form-group mb-6">
      <label for="groupPriceSvelte" class="block mb-1 text-sm font-medium text-gray-700">Group Price (USD):</label>
      <input type="number" id="groupPriceSvelte" class="input input-bordered w-full" required step="any" bind:value={groupPrice} on:input={() => lastEditedField = 'groupPrice'}>
    </div>

    <div class="form-group mb-6">
      <label for="assetAmountSvelte" id="assetAmountLabelSvelte" class="block mb-1 text-sm font-medium text-gray-700">{assetAmountLabel}</label>
      <input type="number" id="assetAmountSvelte" class="input input-bordered w-full" required step="any" bind:value={assetAmount} on:input={() => lastEditedField = 'assetAmount'}>
    </div>

    <div class="advanced-toggle mb-6 text-center">
      <button type="button" class="btn btn-ghost" on:click={() => advancedParamsVisible = !advancedParamsVisible}>
        {advancedParamsVisible ? 'Hide' : 'Show'} Advanced Parameters
      </button>
    </div>

    {#if advancedParamsVisible}
      <div class="advanced-params border-t pt-6 mt-6">
        <div class="form-group mb-6">
          <label for="groupInitWeightSvelte" class="block mb-1 text-sm font-medium text-gray-700">Group Initial Weight (0-100):</label>
          <input type="number" id="groupInitWeightSvelte" class="input input-bordered w-full" min="0" max="100" bind:value={groupInitWeight}>
        </div>
        <div class="form-group mb-6">
          <label for="groupFinalWeightSvelte" class="block mb-1 text-sm font-medium text-gray-700">Group Final Weight (0-100):</label>
          <input type="number" id="groupFinalWeightSvelte" class="input input-bordered w-full" min="0" max="100" bind:value={groupFinalWeight}>
        </div>
        <div class="form-group mb-6">
          <label for="swapFeeSvelte" class="block mb-1 text-sm font-medium text-gray-700">Swap Fee (0-100):</label>
          <input type="number" id="swapFeeSvelte" class="input input-bordered w-full" min="0" max="100" bind:value={swapFee}>
        </div>
        <div class="form-group mb-6">
          <label for="updateWeightDurationSvelte" class="block mb-1 text-sm font-medium text-gray-700">Update Weight Duration (in seconds):</label>
          <input type="number" id="updateWeightDurationSvelte" class="input input-bordered w-full" bind:value={updateWeightDuration}>
        </div>
      </div>
    {/if}

    <button type="submit" class="btn btn-primary">Create LBP Starter (UI Only)</button>
  </form>

  <div class="status mt-6 p-4 rounded-md" class:success={statusType === 'success'} class:error={statusType === 'error'}>
    {statusMessage}
  </div>

  <div id="starterStatusSvelte" class="mt-6">
    {@html starterStatusDisplay}
    {#if showCreateLBPButton}
      <div class="mt-4"><button class="btn btn-secondary" on:click={() => handleCreateLBPClick(existingStarterAddress)}>Create LBP (UI Only)</button></div>
    {/if}
    {#if showSendAssetButton}
      <div class="mt-4"><b>Send Asset (e.g. sDAI):</b><br>
      <button class="btn btn-secondary mt-2" on:click={() => handleSendAssetClick(existingStarterAddress, currentAssetAddressForButtons, currentAssetAmountResultForButtons, currentBalanceAssetForButtons)}>Send from Wallet (UI Only)</button></div>
    {/if}
    {#if showSendGroupButton}
      <div class="mt-4"><b>Send Group Token:</b><br>
      <a href='#' target='_blank' class="link link-primary mt-2" on:click|preventDefault={() => console.log('STUB: Send via Metri link clicked')}>Send via Metri (UI Only)</a>
      </div>
    {/if}
  </div>
</div>
