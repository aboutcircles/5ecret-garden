<script lang="ts">
  import {onMount} from "svelte";
  import {
    Contract, ethers, keccak256,
    parseUnits,
    toBigInt, toUtf8Bytes,
  } from "ethers";
  import {
    type TransactionRequest,
    type SdkContractRunner
  } from "@circles-sdk/adapter";
  import {circles} from "$lib/stores/circles";
  import {avatarState} from "$lib/stores/avatar.svelte";
  import {circlesConfig} from "@circles-sdk/sdk";

  const HUB_V2 = "0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8";
  const USDC_E = "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0";
  const BACKING_FACTORY = "0xecEd91232C609A42F6016860E8223B8aEcaA7bd0";

  const USDC_AMOUNT = parseUnits("100", 6);   // 100 USDC.e
  const CIRCLES_AMOUNT = parseUnits("48", 18);   // 48 CRC

  const factoryAbi = ["function computeAddress(address backer) view returns (address)"];
  const erc20Abi = ["function approve(address spender,uint256 value)"];
  const hubAbi = [
    "function safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)"
  ];

  let safeAddress: string | undefined = $state(undefined);
  let backingAsset = $state("0x0000000000000000000000008e5bbbb09ed1ebde8674cda39a0c169401db4252"); // WBTC default
  let circlesBacking: string | undefined = $state(undefined);
  let txHash: string | undefined = $state(undefined);
  let log: string = $state("");
  let runner: SdkContractRunner | undefined = $state(undefined);
  let jsonRpcProvider: ethers.JsonRpcProvider | undefined = $state(undefined);

  const idFromAddress = (addr: string) => toBigInt(addr);
  const addLog = (msg: string) => (log += `${msg}\n`);

  async function connect() {
    if (!$circles) {
      addLog("Circles SDK not initialized");
      return;
    }

    jsonRpcProvider = new ethers.JsonRpcProvider(circlesConfig[100].circlesRpcUrl);
    runner = $circles.contractRunner;
  }

  async function run() {
    if (!runner) {
      addLog("Connect wallet first.");
      return;
    }
    if (safeAddress?.length !== 42) {
      addLog("Safe address seems invalid.");
      return;
    }

    // predict CirclesBacking
    const factory = new Contract(BACKING_FACTORY, factoryAbi, jsonRpcProvider);
    circlesBacking = (await factory.computeAddress(safeAddress)).toLowerCase();
    addLog(`Predicted CirclesBacking → ${circlesBacking}`);

    // register on CoW (fetch)
    const fullAppDataObj = {
      version: '1.1.0',
      appCode: 'Circles backing powered by AboutCircles',
      metadata: {
        hooks: {
          version: '0.1.0',
          post: [
            {
              target: circlesBacking,
              callData: '0x13e8f89f',
              gasLimit: '6000000'
            }
          ]
        }
      }
    };

    // stringify *once* (no pretty-print, no extra spaces!)
    const fullAppData = JSON.stringify(fullAppDataObj);

    // hash with Keccak-256
    const appDataHash = keccak256(toUtf8Bytes(fullAppData));

    const fetchParams = {
      method: 'PUT',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({fullAppData})
    };

    // PUT with the hash in the URL
    await fetch(
      `https://api.cow.fi/xdai/api/v1/app_data/${appDataHash}`,
      fetchParams
    );

    addLog("CoW appData registered");

    // Encode contract calls
    const usdc = new Contract(USDC_E, erc20Abi);
    const hub = new Contract(HUB_V2, hubAbi);

    // Approve USDC.e for CirclesBacking
    const approveData = usdc.interface.encodeFunctionData("approve", [
      BACKING_FACTORY,
      USDC_AMOUNT
    ]);

    // Transfer CRC to CirclesBacking
    const transferData = hub.interface.encodeFunctionData("safeTransferFrom", [
      safeAddress,
      BACKING_FACTORY,
      idFromAddress(safeAddress),
      CIRCLES_AMOUNT,
      backingAsset
    ]);

    // Send the batch transaction
    const batch = runner.sendBatchTransaction!();

    batch.addTransaction(<TransactionRequest>{
      to: USDC_E,
      value: 0n,
      data: approveData
    });
    batch.addTransaction(<TransactionRequest>{
      to: HUB_V2,
      value: 0n,
      data: transferData
    });

    const receipt = await batch.run();
    txHash = receipt.hash ?? "";
    addLog(`Batch executed – tx hash: ${txHash}`);
  }

  onMount(() => {
    log = "";
    if (avatarState.avatar) {
      safeAddress = avatarState.avatar.address;
    }
  });
</script>

<div class="flex flex-col items-center p-6 gap-4 max-w-xl mx-auto">
  <div class="card w-full shadow-xl">
    <div class="card-body space-y-4">

      <h2 class="card-title">Personal Circles Backing</h2>

      <label class="form-control w-full">
        <span class="label-text">Safe address</span>
        <input class="input input-bordered w-full" bind:value={safeAddress} placeholder="0x..."/>
      </label>

      <label class="form-control w-full">
        <span class="label-text">Backing asset</span>
        <select class="select select-bordered w-full" bind:value={backingAsset}>
          <option value="0x0000000000000000000000008e5bbbb09ed1ebde8674cda39a0c169401db4252">WBTC</option>
          <option value="0x0000000000000000000000006a023ccd1ff6f2045c3309768ead9e68f978f6e1">WETH</option>
          <option value="0x0000000000000000000000009c58bacc331c9aa871afd802db6379a98e80cedb">GNO</option>
          <option value="0x000000000000000000000000af204776c7245bf4147c2612bf6e5972ee483701">sDAI</option>
        </select>
      </label>

      <div class="flex gap-3">
        <button class="btn btn-primary flex-1" onclick={connect}>
          {runner ? "Connected" : "Connect Wallet"}
        </button>
        <button class="btn btn-secondary flex-1" onclick={run} disabled={!runner}>
          Run Flow
        </button>
      </div>

      {#if circlesBacking}
        <div class="alert alert-info break-all">
          CirclesBacking: {circlesBacking}
        </div>
      {/if}

      {#if txHash}
        <div class="alert alert-success break-all">
          Tx: {txHash}
        </div>
      {/if}

      <pre class="p-3 border-2 rounded-md h-48 overflow-y-auto whitespace-pre-wrap text-xs">{log}</pre>
    </div>
  </div>
</div>

<style>
    .alert {
        word-break: break-word;
    }
</style>
