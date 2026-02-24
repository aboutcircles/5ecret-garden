<script lang="ts">
    import type { TransactionHistoryRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    // Lucide icons are node definitions (arrays). Use the local Lucide wrapper to render them.
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { ArrowRight as LArrowRight, ExternalLink as LExternalLink, Flame as LFlame, Coins as LCoins, Copy as LCopy } from 'lucide';
    import { CirclesConverter } from '@circles-sdk/utils';
    import { isAddress, isZeroAddress, toBigIntMaybe, tokenIdToAddressMaybe } from '$lib/shared/utils/tx';
    import TxEvents from './TxEvents.svelte';
    import { popupControls } from '$lib/shared/state/popup';
    import JumpPopup from '$lib/shared/ui/content/jump/JumpPopup.svelte';

    interface Props { item: TransactionHistoryRow }
    let { item }: Props = $props();

    // Tab control removed (JSON view no longer needed)

    // Robust timestamp handling: support seconds and milliseconds
    const dateTime = $derived(() => {
        const ts = Number(item.timestamp ?? 0);
        const ms = ts < 1e12 ? ts * 1000 : ts;
        return new Date(ms).toLocaleString();
    });

    // Whether the current viewer is the sender of this transaction (still used for the label).
    const sent = $derived((() => {
        const me = avatarState.avatar?.address?.toLowerCase();
        if (!me) {
            return false;
        }
        return item.from.toLowerCase() === me;
    })());

    function formatAmount(v: number): string {
        const abs = Math.abs(v);

        // Treat both 0 and -0 as exact zero and render as "0"
        const isZero = Object.is(abs, 0);
        if (isZero) {
            return '0';
        }

        if (abs < 0.01) {
            return '< 0.01';
        }
        return abs.toFixed(2);
    }

    function normalizeTiny(v: number, eps: number = 1e-9): number {
        if (!Number.isFinite(v)) {
            return v;
        }
        if (Math.abs(v) < eps) {
            return 0;
        }
        return v;
    }

    // JSON tab moved to TxJson component

    function openOnExplorer() {
        popupControls.open({
            title: 'Leaving this app',
            component: JumpPopup,
            props: { to: `https://gnosisscan.io/tx/${item.transactionHash}` },
        });
    }

    function copyHash() {
        navigator.clipboard?.writeText(item.transactionHash).catch(() => {});
    }

    // moved helpers to $lib/shared/utils/tx and $lib/shared/utils/json

    type TxEvent = Record<string, any> & { $type?: string };

    const events = $derived<TxEvent[]>(() => {
        const raw = (item as any)?.events;
        if (!raw) {
            return [];
        }
        try {
            if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                return [];
            }
            if (Array.isArray(raw)) {
                return raw;
            }
            return [];
        } catch (e) {
            console.warn('Failed to parse events from transaction item', e);
            return [];
        }
    });

    // DiscountCost aggregation: (account, id) -> total cost
    const discountCostByAccountAndId = $derived<Map<string, bigint>>(() => {
        const map = new Map<string, bigint>();
        for (const ev of events()) {
            const type = String(ev.$type ?? '');
            if (type !== 'CrcV2_DiscountCost') {
                continue;
            }
            const account = isAddress((ev as any).Account) ? String((ev as any).Account).toLowerCase() : null;
            const id = (ev as any).Id;
            const cost = toBigIntMaybe((ev as any).Cost);
            if (!account || id === undefined || cost === null) {
                continue;
            }
            const key = `${account}|${String(id)}`;
            const prev = map.get(key) ?? 0n;
            map.set(key, prev + cost);
        }
        return map;
    });

    // Check whether a TransferSingle burn matches a DiscountCost (protocol fee)
    function isProtocolCostBurn(ev: TxEvent): boolean {
        const type = String(ev.$type ?? '');
        if (type !== 'CrcV2_TransferSingle') {
            return false;
        }
        const from = isAddress((ev as any).From) ? String((ev as any).From).toLowerCase() : null;
        const to = isAddress((ev as any).To) ? String((ev as any).To).toLowerCase() : null;
        if (!from || !to) {
            return false;
        }
        if (!isZeroAddress(to)) {
            return false;
        }
        const id = (ev as any).Id;
        const value = toBigIntMaybe((ev as any).Value);
        if (id === undefined || value === null) {
            return false;
        }
        const key = `${from}|${String(id)}`;
        const expected = discountCostByAccountAndId().get(key);
        if (expected === undefined) {
            return false;
        }
        return expected === value;
    }

    // --- Aggregated transfers (CrcV2_Transfer*) ---
    type Transfer = {
        from: string;
        to: string;
        amount: number;
        tokenAddress: string | null;
        isProtocolCost: boolean;
    };
    type AggregatedTransfer = { from: string; to: string; amount: number; tokenAddress: string | null };

    const asAddressMaybe = (val: unknown): string | null => (isAddress(val) ? String(val).toLowerCase() : null);

    function toCirclesNumber(val: unknown): number | null {
        // Fallback path first: treat finite JS numbers as already UI circles/CRC
        if (typeof val === 'number' && Number.isFinite(val)) {
            return val;
        }

        const bi = toBigIntMaybe(val);
        if (bi !== null) {
            try {
                const circles = CirclesConverter.attoCirclesToCircles(bi);
                if (!Number.isFinite(circles)) {
                    console.warn('toCirclesNumber: non-finite result from atto value', {
                        value: val,
                        bigint: bi.toString(),
                        circles
                    });
                    return null;
                }
                return circles;
            } catch (error) {
                console.warn('toCirclesNumber: failed to convert atto value via CirclesConverter', {
                    value: val,
                    bigint: bi.toString(),
                    error
                });
                return null;
            }
        }

        return null;
    }

    function extractTransfers(ev: TxEvent): Transfer[] {
        const type = String(ev.$type ?? '');
        const isTransferLike = /^CrcV2_Transfer/.test(type) || type === 'CrcV2_Erc20WrapperTransfer';
        if (!isTransferLike) {
            return [];
        }

        const from = asAddressMaybe(ev.From);
        const to = asAddressMaybe(ev.To);
        if (!from || !to) {
            return [];
        }
        if (from === to) {
            return [];
        }

        const tokenAddress = tokenIdToAddressMaybe('Id', (ev as any).Id) ?? null;
        const protocolCost = isProtocolCostBurn(ev);

        if ('Value' in ev) {
            const amount = toCirclesNumber((ev as any).Value);
            if (amount === null) {
                return [];
            }
            return [{ from, to, amount, tokenAddress, isProtocolCost: protocolCost }];
        }

        if (Array.isArray((ev as any).Values)) {
            const vals: unknown[] = (ev as any).Values;
            const sum = vals.reduce((acc, v) => {
                const n = toCirclesNumber(v);
                if (n === null) {
                    return acc;
                }
                return acc + n;
            }, 0);
            if (sum === 0) {
                return [];
            }
            return [{ from, to, amount: sum, tokenAddress, isProtocolCost: protocolCost }];
        }

        return [];
    }

    const transfers = $derived<Transfer[]>(() => {
        const all: Transfer[] = [];
        for (const ev of events()) {
            const legs = extractTransfers(ev);
            if (!legs.length) {
                continue;
            }
            for (const t of legs) {
                all.push(t);
            }
        }
        return all;
    });

    const aggregatedTransfers = $derived<AggregatedTransfer[]>(() => {
        const map = new Map<string, { a: string; b: string; net: number; tokenAddress: string | null }>();

        for (const t of transfers()) {
            // Exclude protocol-cost transfers from the "intended transfers" aggregation.
            // These will be shown separately in the Burns section.
            if (t.isProtocolCost) {
                continue;
            }

            const from = t.from.toLowerCase();
            const to = t.to.toLowerCase();
            if (from === to) {
                continue;
            }

            const a = from;
            const b = to;
            const [min, max] = a < b ? [a, b] : [b, a];
            const key = `${min}|${max}`;
            const existing = map.get(key);
            const rec = existing ?? { a: min, b: max, net: 0, tokenAddress: null };

            const delta = from === rec.a ? t.amount : -t.amount;
            rec.net += delta;

            if (!rec.tokenAddress && t.tokenAddress) {
                rec.tokenAddress = t.tokenAddress;
            }

            map.set(key, rec);
        }

        const result: AggregatedTransfer[] = [];
        for (const { a, b, net, tokenAddress } of map.values()) {
            const amt = Math.abs(net);
            if (amt <= 0) {
                continue;
            }
            const from = net >= 0 ? a : b;
            const to = net >= 0 ? b : a;
            result.push({ from, to, amount: amt, tokenAddress });
        }
        result.sort((x, y) => y.amount - x.amount);
        return result;
    });

    const aggregatedBurnTransfers = $derived<AggregatedTransfer[]>(() => {
        const map = new Map<string, { a: string; b: string; net: number; tokenAddress: string | null }>();

        for (const t of transfers()) {
            const from = t.from.toLowerCase();
            const to = t.to.toLowerCase();

            // Only aggregate burns (to the zero address)
            if (!isZeroAddress(to)) {
                continue;
            }
            if (from === to) {
                continue;
            }

            const a = from;
            const b = to;
            const [min, max] = a < b ? [a, b] : [b, a];
            const key = `${min}|${max}`;
            const existing = map.get(key);
            const rec = existing ?? { a: min, b: max, net: 0, tokenAddress: null };

            const delta = from === rec.a ? t.amount : -t.amount;
            rec.net += delta;

            if (!rec.tokenAddress && t.tokenAddress) {
                rec.tokenAddress = t.tokenAddress;
            }

            map.set(key, rec);
        }

        const result: AggregatedTransfer[] = [];
        for (const { a, b, net, tokenAddress } of map.values()) {
            const amt = Math.abs(net);
            if (amt <= 0) {
                continue;
            }
            const from = net >= 0 ? a : b;
            const to = net >= 0 ? b : a;
            result.push({ from, to, amount: amt, tokenAddress });
        }
        result.sort((x, y) => y.amount - x.amount);
        return result;
    });

    // Net amount for the current viewer, excluding protocol-cost burns
    const netAmountForViewer = $derived<number | null>(() => {
        const me = avatarState.avatar?.address?.toLowerCase();
        if (!me) {
            return null;
        }
        let net = 0;
        for (const t of transfers()) {
            if (t.isProtocolCost) {
                continue;
            }
            if (t.from === me) {
                net -= t.amount;
            }
            if (t.to === me) {
                net += t.amount;
            }
        }
        net = normalizeTiny(net);
        return net;
    });

    // Demurrage / protocol-cost for viewer
    const demurrageAmount = $derived<number>(() => {
        const me = avatarState.avatar?.address?.toLowerCase();
        if (!me) {
            return 0;
        }
        let net = 0;
        for (const t of transfers()) {
            if (!t.isProtocolCost) {
                continue;
            }
            if (t.from === me) {
                net -= t.amount;
            }
            if (t.to === me) {
                net += t.amount;
            }
        }
        // round to 2 decimals to avoid dust
        net = Math.round(net * 100) / 100;
        net = normalizeTiny(net);
        return net;
    });
    const demurrageAbs = $derived(() => Math.abs(demurrageAmount()));

    // Header amount: intended transfers (excluding protocol fees).
    // Fallback to item.circles if we have no viewer context.
    const headerNetAmount = $derived(() => {
        const viewerNet = netAmountForViewer();
        if (typeof viewerNet === 'number') {
            return viewerNet;
        }
        const base = typeof item.circles === 'number' ? item.circles : Number(item.circles ?? 0);
        return base;
    });

    const headerAbsAmount = $derived(() => Math.abs(headerNetAmount()));
    const headerSign = $derived(() => headerNetAmount() < 0 ? '-' : headerNetAmount() > 0 ? '+' : '');
    const signedAmount = $derived(() => `${headerSign()}${formatAmount(headerAbsAmount())}`);
    const headerColorClass = $derived(() => {
        if (headerNetAmount() < 0) {
            return 'text-error';
        }
        if (headerNetAmount() > 0) {
            return 'text-success';
        }
        return 'text-base-content';
    });

    const nonBurnTransfers = $derived(() =>
        aggregatedTransfers().filter(t => !isZeroAddress(t.to))
    );

    // Burns are aggregated separately (including protocol-cost burns)
    const burnTransfers = $derived(() => aggregatedBurnTransfers());

    let burnsOpen = $state(false);
    function toggleBurns() {
        burnsOpen = !burnsOpen;
    }

    const totalBurned = $derived(() =>
        burnTransfers().reduce((acc, t) => acc + (t?.amount ?? 0), 0)
    );

    // Zero-sum swap detection for item.from vs item.to, ignoring protocol DiscountCost burns
    type SwapSummary = {
        forwardAmount: number;
        backwardAmount: number;
        forwardTokenAddress: string | null;
        backwardTokenAddress: string | null;
    };

    const swapSummary = $derived<SwapSummary | null>(() => {
        const fromAddr = item.from?.toLowerCase();
        const toAddr = item.to?.toLowerCase();
        if (!fromAddr || !toAddr) {
            return null;
        }

        // Only consider swaps when there is an actual stream between from→to
        let hasStreamBetween = false;
        for (const ev of events()) {
            const type = String(ev.$type ?? '');
            if (type !== 'CrcV2_StreamCompleted') {
                continue;
            }
            const evFrom = asAddressMaybe((ev as any).From);
            const evTo = asAddressMaybe((ev as any).To);
            if (evFrom === fromAddr && evTo === toAddr) {
                hasStreamBetween = true;
                break;
            }
        }
        if (!hasStreamBetween) {
            return null;
        }

        let totalOut = 0;
        let totalIn = 0;
        let outTokenAddress: string | null = null;
        let inTokenAddress: string | null = null;

        for (const t of transfers()) {
            const f = t.from.toLowerCase();
            const tt = t.to.toLowerCase();

            // Outgoing from item.from, excluding protocol-cost burns
            if (f === fromAddr && !t.isProtocolCost) {
                totalOut += t.amount;
                if (!outTokenAddress && t.tokenAddress) {
                    outTokenAddress = t.tokenAddress;
                }
            }

            // Incoming from item.to back to item.from
            if (f === toAddr && tt === fromAddr) {
                totalIn += t.amount;
                if (!inTokenAddress && t.tokenAddress) {
                    inTokenAddress = t.tokenAddress;
                }
            }
        }

        if (totalOut <= 0 || totalIn <= 0) {
            return null;
        }

        const net = totalIn - totalOut;
        if (!Number.isFinite(net)) {
            return null;
        }
        const epsilon = 1e-9;
        if (Math.abs(net) > epsilon) {
            return null;
        }

        return {
            forwardAmount: totalOut,
            backwardAmount: totalIn,
            forwardTokenAddress: outTokenAddress,
            backwardTokenAddress: inTokenAddress
        };
    });

    // For non-swap directional view, pick the main token for item.from -> item.to
    const mainTokenAddress = $derived<string | null>(() => {
        const fromAddr = item.from?.toLowerCase();
        const toAddr = item.to?.toLowerCase();
        if (!fromAddr || !toAddr) {
            return null;
        }
        for (const t of transfers()) {
            const f = t.from.toLowerCase();
            const tt = t.to.toLowerCase();
            if (f === fromAddr && tt === toAddr && t.tokenAddress) {
                return t.tokenAddress;
            }
        }
        return null;
    });

    let openEvents = $state<Set<number>>(new Set());
    function isOpen(i: number) {
        return openEvents.has(i);
    }
    function toggleOpen(i: number) {
        const next = new Set(openEvents);
        if (next.has(i)) {
            next.delete(i);
        } else {
            next.add(i);
        }
        openEvents = next;
    }

    let eventsListOpen = $state(false);
    function toggleEventsList() {
        eventsListOpen = !eventsListOpen;
    }

    const niceKey = (k: string) => {
        if (k === '$type') {
            return 'Type';
        }
        return k
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/^Id$/i, 'ID');
    };

    const primaryOrder = ['$', '$type', 'Emitter', 'Operator', 'From', 'To', 'Account', 'Sender', 'Receiver', 'Group', 'Id', 'Value', 'Cost', 'Amount', 'BatchIndex', 'LogIndex'];
    const hiddenKeys = new Set(['BlockNumber', 'Timestamp', 'TransactionIndex', 'TransactionHash']);
    const eventDisplayEntries = (ev: TxEvent): [string, any][] => {
        const entries: [string, any][] = Object.entries(ev).filter(([k]) => !hiddenKeys.has(k));
        const orderIndex = (k: string) => {
            const idx = primaryOrder.indexOf(k);
            if (idx === -1) {
                return 999;
            }
            return idx;
        };
        entries.sort(([a], [b]) => {
            const ai = orderIndex(a);
            const bi = orderIndex(b);
            if (ai !== bi) {
                return ai - bi;
            }
            return a.localeCompare(b);
        });
        return entries;
    };
</script>

<div class="flex flex-col w-full">
        <div class="pt-4">
            <!-- Amount + From/To (border around tx-value block, with splitter between amount and diagram) -->
            <div class="bg-base-100 border rounded-xl overflow-hidden divide-y">
                <div class="p-4 flex flex-col items-center justify-center">
                    <div class="text-center">
                        <div class={`text-3xl sm:text-4xl font-extrabold ${headerColorClass()}`}>
                            {signedAmount()} <span class="opacity-70 text-base align-middle">CRC</span>
                        </div>
                    </div>
                    {#if demurrageAbs() > 0}
                        <div class="mt-1 text-sm font-semibold text-error">
                            -{formatAmount(demurrageAbs())}
                            <span class="opacity-70 text-xs align-middle"> CRC demurrage</span>
                        </div>
                    {/if}
                </div>

                <div class="p-3">
                    {#if swapSummary()}
                        <div class="space-y-2">
                            <!-- Forward leg -->
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2 min-w-0">
                                    <Avatar address={item.from} view="horizontal" clickable={true} />
                                </div>
                                <div class="shrink-0 flex items-center gap-2 text-base-content/70">
                                    {#if swapSummary()?.forwardTokenAddress}
                                        <Avatar address={swapSummary().forwardTokenAddress} view="small_no_text" clickable={true} />
                                    {/if}
                                    <Lucide icon={LArrowRight} size={18} />
                                </div>
                                <div class="flex items-center gap-2 min-w-0 justify-end">
                                    <Avatar address={item.to} view="horizontal" clickable={true} />
                                </div>
                            </div>
                            <!-- Return leg -->
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2 min-w-0">
                                    <Avatar address={item.from} view="horizontal" clickable={true} />
                                </div>
                                <div class="shrink-0 flex items-center gap-2 text-base-content/70">
                                    {#if swapSummary()?.backwardTokenAddress}
                                        <Avatar address={swapSummary().backwardTokenAddress} view="small_no_text" clickable={true} />
                                    {/if}
                                    <div class="rotate-180">
                                        <Lucide icon={LArrowRight} size={18} />
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 min-w-0 justify-end">
                                    <Avatar address={item.to} view="horizontal" clickable={true} />
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 min-w-0">
                                <Avatar address={item.from} view="horizontal" clickable={true} />
                            </div>
                            <div class="shrink-0 flex items-center gap-2 text-base-content/70">
                                {#if mainTokenAddress()}
                                    <Avatar address={mainTokenAddress()} view="small_no_text" clickable={true} />
                                {/if}
                                <Lucide icon={LArrowRight} size={18} />
                            </div>
                            <div class="flex items-center gap-2 min-w-0 justify-end">
                                <Avatar address={item.to} view="horizontal" clickable={true} />
                            </div>
                        </div>
                        <div class="mt-3 flex items-center justify-between">
                            <div class="text-sm opacity-70">Direction</div>
                            <div class="text-sm">{sent ? 'You sent this' : 'You received this'}</div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Table-like details -->
            <div class="bg-base-100 border mt-4 rounded-xl overflow-hidden">
                <div class="divide-y">
                    <div class="flex items-center justify-between gap-4 p-3">
                        <div class="text-sm opacity-70">Date & time</div>
                        <div class="text-sm">{dateTime()}</div>
                    </div>
                    <div class="flex items-center gap-4 p-3">
                        <div class="text-sm opacity-70 shrink-0">Transaction hash</div>
                        <div class="flex-1 min-w-0">
                            <div class="font-mono text-xs truncate" title={item.transactionHash}>{item.transactionHash}</div>
                        </div>
                        <div class="shrink-0 flex items-center gap-2">
                            <button class="btn btn-xs btn-ghost" onclick={copyHash} title="Copy hash">
                                <Lucide icon={LCopy} size={14} /> Copy
                            </button>
                            <button class="btn btn-xs btn-primary" onclick={openOnExplorer} title="Open on Gnosisscan">
                                <Lucide icon={LExternalLink} size={14} /> Open
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {#if aggregatedTransfers().length}
                <div class="bg-base-100 border mt-4 rounded-xl overflow-hidden">
                    <div class="p-3 border-b">
                        <div class="text-sm opacity-70">
                            Aggregated transfers <span class="opacity-60">({aggregatedTransfers().length})</span>
                        </div>
                    </div>
                    <div class="divide-y">
                        {#each nonBurnTransfers() as t}
                            <div class="px-3 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 hover:bg-base-200/40 transition-colors">
                                <div class="flex-1 min-w-0 flex items-center gap-2">
                                    {#if isZeroAddress(t.from)}
                                        <div class="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center" title="Minted">
                                            <Lucide icon={LCoins} size={14} class="text-success" />
                                        </div>
                                    {:else}
                                        <div class="sm:hidden">
                                            <Avatar address={t.from} view="small_no_text" clickable={true} />
                                        </div>
                                        <div class="hidden sm:inline-flex">
                                            <Avatar address={t.from} view="small" clickable={true} />
                                        </div>
                                    {/if}
                                </div>
                                <div class="shrink-0 text-sm sm:text-base font-semibold tabular-nums">
                                    {formatAmount(t.amount)} <span class="opacity-70">CRC</span>
                                </div>
                                <div class="shrink-0 flex items-center gap-2 text-base-content/70">
                                    {#if t.tokenAddress}
                                        <Avatar address={t.tokenAddress} view="small_no_text" clickable={true} />
                                    {/if}
                                    <div class="w-6 h-6 rounded-full bg-base-200/70 flex items-center justify-center">
                                        <Lucide icon={LArrowRight} size={16} />
                                    </div>
                                </div>
                                <div class="flex-1 min-w-0 flex items-center gap-2 justify-end">
                                    <div class="sm:hidden">
                                        <Avatar address={t.to} view="small_no_text" clickable={true} />
                                    </div>
                                    <div class="hidden sm:inline-flex">
                                        <Avatar address={t.to} view="small_reverse" clickable={true} />
                                    </div>
                                </div>
                            </div>
                        {/each}
                        {#if burnTransfers().length}
                            <button
                                    class="w-full p-3 bg-base-200/50 text-xs uppercase tracking-wide text-base-content/60 flex items-center justify-between hover:bg-base-200/70 transition-colors"
                                    onclick={toggleBurns}
                                    aria-expanded={burnsOpen}
                                    title={burnsOpen ? 'Hide burns' : 'Show burns'}
                            >
                                <span>
                                    Burns <span class="opacity-60">({burnTransfers().length})</span>
                                </span>
                                <span class="text-[11px] normal-case opacity-80">
                                    {formatAmount(totalBurned())} <span class="opacity-70">CRC</span>
                                </span>
                            </button>
                            {#if burnsOpen}
                                {#each burnTransfers() as t}
                                    <div class="px-3 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 hover:bg-base-200/40 transition-colors">
                                        <div class="flex-1 min-w-0 flex items-center gap-2">
                                            {#if isZeroAddress(t.from)}
                                                <div class="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center" title="Minted">
                                                    <Lucide icon={LCoins} size={14} class="text-success" />
                                                </div>
                                            {:else}
                                                <div class="sm:hidden">
                                                    <Avatar address={t.from} view="small_no_text" clickable={true} />
                                                </div>
                                                <div class="hidden sm:inline-flex">
                                                    <Avatar address={t.from} view="small" clickable={true} />
                                                </div>
                                            {/if}
                                        </div>
                                        <div class="shrink-0 text-sm sm:text-base font-semibold tabular-nums">
                                            {formatAmount(t.amount)} <span class="opacity-70">CRC</span>
                                        </div>
                                        <div class="shrink-0 flex items-center gap-2 text-base-content/70">
                                            {#if t.tokenAddress}
                                                <Avatar address={t.tokenAddress} view="small_no_text" clickable={true} />
                                            {/if}
                                            <div class="w-6 h-6 rounded-full bg-base-200/70 flex items-center justify-center">
                                                <Lucide icon={LArrowRight} size={16} />
                                            </div>
                                        </div>
                                        <div class="flex-1 min-w-0 flex items-center gap-2 justify-end">
                                            <div class="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center" title="Burned">
                                                <Lucide icon={LFlame} size={14} class="text-error" />
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            {/if}
                        {/if}
                    </div>
                </div>
            {/if}

            <TxEvents
                events={events()}
                {eventDisplayEntries}
                {niceKey}
                {isOpen}
                {toggleOpen}
                {eventsListOpen}
                {toggleEventsList}
            />
        </div>
</div>

<style>
    /* No bespoke theme here; rely on Tailwind/DaisyUI to match the app. */
</style>
