<script lang="ts">
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import { circles } from '$lib/shared/state/circles';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import { runTask } from '$lib/shared/utils/tasks';
    import { popupControls } from '$lib/shared/state/popup';
    import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
    import { cidV0ToUint8Array } from '@circles-sdk/utils';
    import { isValidSymbol, isValidOnChainName } from '$lib/shared/utils/isValid';
    import { ensureGnosisChain } from '$lib/shared/integrations/chain/gnosis';
    import { getWalletProvider } from '$lib/shared/integrations/wallet';
    import {
        createGroupContext,
        type CreateGroupFlowContext,
        resetCreateGroupContext
    } from './context';
  import { Contract, JsonRpcProvider } from 'ethers';
  import type { AddressLike } from 'ethers';

    const PROFILE_NAME_MAX_LENGTH = 36;

    interface Props {
        context?: CreateGroupFlowContext;
        setGroup?: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => void;
    }

    let { context, setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state(context ?? $createGroupContext);

    function extractAddressFromTopic(topic: string | undefined): string | null {
        const looksRight: boolean = typeof topic === 'string' && topic.startsWith('0x') && topic.length === 66;
        if (!looksRight) { return null; }
        const addr = '0x' + topic.slice(26);
        return addr.toLowerCase();
    }

    const SAFE_VIEW_ABI = [
        'function getOwners() view returns (address[])',
        'function getThreshold() view returns (uint256)'
    ];

    async function getSafeInfo(safe: string): Promise<{ owners: string[]; threshold: number }> {
        const provider = new JsonRpcProvider('https://rpc.aboutcircles.com');
        const contract = new Contract(safe, SAFE_VIEW_ABI, provider);
        const owners = (await (contract.getOwners() as Promise<string[]>)).map((o) => o.toLowerCase());
        const thresholdRaw = await (contract.getThreshold() as Promise<bigint | number>);
        const threshold = typeof thresholdRaw === 'bigint' ? Number(thresholdRaw) : thresholdRaw;
        return { owners, threshold };
    }

    async function assertWalletCanSignForSafe(safeAddress: string): Promise<void> {
        const ethereum = getWalletProvider();
        await ensureGnosisChain(ethereum);

        const accounts = (await ethereum.request({ method: 'eth_requestAccounts' }) as string[] | undefined) ?? [];
        const eoa = String(accounts[0] ?? '').toLowerCase();
        if (!/^0x[a-f0-9]{40}$/.test(eoa)) {
            throw new Error('No EOA account unlocked in wallet');
        }

        const info = await getSafeInfo(safeAddress);
        if (info.threshold !== 1) {
            throw new Error(`Safe threshold must be 1 for group creation in this flow (current: ${info.threshold}).`);
        }
        if (!new Set(info.owners).has(eoa)) {
            throw new Error(`Connected account ${eoa} is not an owner of Safe ${safeAddress}.`);
        }
    }

    async function createGroup() {
        const hasSdk: boolean = !!$circles;
        const hasWallet: boolean = !!$wallet?.address;
        const profileNameLength: number = (ctx.profile.name ?? '').trim().length;
        const profileNameOk: boolean = profileNameLength > 0 && profileNameLength <= PROFILE_NAME_MAX_LENGTH;
        const symbolOk: boolean = isValidSymbol(ctx.profile.symbol);
        const onChainOk: boolean = isValidOnChainName(onChainName);
        if (!hasSdk) { throw new Error('SDK not initialized'); }
        if (!hasWallet) { throw new Error('Wallet not connected'); }
        if (!profileNameOk || !symbolOk || !onChainOk) {
            throw new Error('Invalid profile name (required, max 36 chars), symbol, or on-chain name');
        }

        await runTask({
            name: `Creating ${ctx.profile.symbol} group …`,
            promise: (async () => {
                if (!$circles) { throw new Error('SDK not initialized'); }
                if (!$wallet) { throw new Error('Wallet not initialized'); }

                // Preflight for Safe-based signing flows to fail fast with a clear message.
                // Kept inside runTask so failures open the global dismissable error popup.
                await assertWalletCanSignForSafe(String($wallet.address));

                const CID = await $circles.profiles?.create(ctx.profile);
                if (!CID) { throw new Error('Failed to create profile CID'); }
                ctx.cid = CID;

                console.log($wallet.address, ctx);
                const tx = await $circles.baseGroupFactory?.createBaseGroup(
                    $wallet.address as AddressLike,
                    ctx.service,
                    ctx.feeCollection,
                    ctx.initialConditions,
                    onChainName,
                    ctx.profile.symbol,
                    cidV0ToUint8Array(CID)
                );
                if (!tx) { throw new Error('Failed to submit createBaseGroup transaction'); }

                const receipt = await tx.wait();
                const logs = (receipt as any)?.logs ?? [];
                let groupAddress: string | null = null;

                for (const log of logs) {
                    const topic = (log?.topics && log.topics[1]) as string | undefined;
                    const addr = extractAddressFromTopic(topic);
                    const ok: boolean = !!addr && addr.length === 42;
                    if (ok) { groupAddress = addr!; break; }
                }

                if (!groupAddress) { throw new Error('Could not extract group address from receipt'); }

                // Notify caller (e.g., ConnectCircles) so it can connect the new group and navigate
                try {
                    setGroup?.(groupAddress);
                } catch (e) {
                    console.error('setGroup callback failed', e);
                }

                // Reset context so a new flow starts clean next time
                resetCreateGroupContext($wallet.address as `0x${string}`);

                return groupAddress;
            })()
        });

        popupControls.close();
    }

    const hasDesc: boolean = $derived(!!ctx.profile.description && ctx.profile.description.trim().length > 0);
    const onChainName = $derived(ctx.profile.onChainName ?? ctx.profile.name);
    const fastLane = $derived((ctx.settingsMode ?? 'fast') === 'fast');
</script>

<FlowDecoration>
    <p class="text-sm text-base-content/70 mt-1">We’ll write your profile and deploy the group as a task.</p>

    <!-- Simple summary, row-by-row -->
    <div class="mt-4 space-y-1">
        <div><span class="text-base-content/70 mr-1">Name:</span>{ctx.profile.name}</div>
        <div><span class="text-base-content/70 mr-1">On-chain name:</span>{onChainName}</div>
        <div><span class="text-base-content/70 mr-1">Symbol:</span>{ctx.profile.symbol}</div>
        {#if !fastLane}
            <div class="truncate"><span class="text-base-content/70 mr-1">Service:</span>{ctx.service}</div>
            <div class="truncate"><span class="text-base-content/70 mr-1">Fee collection:</span>{ctx.feeCollection}</div>
            <div><span class="text-base-content/70 mr-1">Initial conditions:</span>{ctx.initialConditions.length}</div>
        {/if}
    </div>

    {#if hasDesc}
        <div class="mt-3">
            <div class="text-base-content/70 mb-0.5">Description</div>
            <Markdown content={ctx.profile.description} class="prose prose-sm max-w-none" />
        </div>
    {/if}

    <!-- Optional image -->
    <div class="mt-4">
        {#if ctx.profile.previewImageUrl}
            <img src={ctx.profile.previewImageUrl} alt="Group" class="w-32 h-32 rounded object-cover" />
        {/if}
    </div>

    <div class="mt-5 flex justify-end">
        <button type="button" class="btn btn-primary" onclick={createGroup}>
            Confirm & Create
        </button>
    </div>
</FlowDecoration>
