<script lang="ts">
    import type { TransactionHistoryRow } from '@aboutcircles/sdk-types';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    // Lucide icons are node definitions (arrays). Use the local Lucide wrapper to render them.
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { ArrowRight as LArrowRight, ExternalLink as LExternalLink, Flame as LFlame, Coins as LCoins, Copy as LCopy } from 'lucide';
    import { CirclesConverter } from '@aboutcircles/sdk-utils';
    import { isAddress, isZeroAddress, toBigIntMaybe, tokenIdToAddressMaybe } from '$lib/shared/utils/tx';
    import TxEvents from './TxEvents.svelte';
    import { popupControls } from '$lib/shared/state/popup';
    import JumpPopup from '$lib/shared/ui/content/jump/JumpPopup.svelte';

    interface Props { item: TransactionHistoryRow }
    let { item }: Props = $props();

    // Tab control removed (JSON view no longer needed)

    // Robust timestamp handling: support seconds and milliseconds
    const dateTime = $derived.by(() => {
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

    // TransactionHistoryRow doesn't declare `events` but the RPC response includes it at runtime
    type ItemWithEvents = TransactionHistoryRow & { events?: unknown };

    const events = $derived.by((): TxEvent[] => {
        const raw = (item as ItemWithEvents)?.events;
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
        } catch {
            return [];
        }
    });

    // Event accessors that work with both PascalCase (raw RPC events) and
    // camelCase (rows produced by transactionHistory.ts) shapes.
    const eventTypeOf = (ev: TxEvent): string => String(ev.$type ?? ev.eventType ?? '');
    const fromOf = (ev: TxEvent): unknown => ev.From ?? ev.from;
    const toOf = (ev: TxEvent): unknown => ev.To ?? ev.to;
    const idOf = (ev: TxEvent): unknown => ev.Id ?? ev.id;
    const valueOf = (ev: TxEvent): unknown => ev.Value ?? ev.value;
    const accountOf = (ev: TxEvent): unknown => ev.Account ?? ev.account;
    const costOf = (ev: TxEvent): unknown => ev.Cost ?? ev.cost;

    // DiscountCost aggregation: (account, id) -> total cost
    const discountCostByAccountAndId = $derived.by((): Map<string, bigint> => {
        const map = new Map<string, bigint>();
        for (const ev of events) {
            if (eventTypeOf(ev) !== 'CrcV2_DiscountCost') {
                continue;
            }
            const acct = accountOf(ev);
            const account = isAddress(acct) ? String(acct).toLowerCase() : null;
            const id = idOf(ev);
            const cost = toBigIntMaybe(costOf(ev));
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
        if (eventTypeOf(ev) !== 'CrcV2_TransferSingle') {
            return false;
        }
        const fromRaw = fromOf(ev);
        const toRaw = toOf(ev);
        const from = isAddress(fromRaw) ? String(fromRaw).toLowerCase() : null;
        const to = isAddress(toRaw) ? String(toRaw).toLowerCase() : null;
        if (!from || !to) {
            return false;
        }
        if (!isZeroAddress(to)) {
            return false;
        }
        const id = idOf(ev);
        const value = toBigIntMaybe(valueOf(ev));
        if (id === undefined || value === null) {
            return false;
        }
        const key = `${from}|${String(id)}`;
        const expected = discountCostByAccountAndId.get(key);
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
                    return null;
                }
                return circles;
            } catch {
                return null;
            }
        }

        return null;
    }

    function extractTransfers(ev: TxEvent): Transfer[] {
        const type = eventTypeOf(ev);
        // Treat any Transfer-flavoured CrcV2 event as transfer-like, plus camelCase
        // synthetic types and mint variants that transactionHistory.ts emits / dev shows.
        const isTransferLike =
            /^CrcV2_Transfer/.test(type)
            || type === 'CrcV2_Erc20WrapperTransfer'
            || type === 'CrcV2_Burn'
            || type === 'CrcV2_PersonalMint'
            || type === 'CrcV2_GroupMint'
            || type === 'CrcV2_GroupRedeemCollateralBurn'
            || type === 'CrcV2_GroupRedeemCollateralReturn';
        if (!isTransferLike) {
            return [];
        }

        const from = asAddressMaybe(fromOf(ev));
        const to = asAddressMaybe(toOf(ev));
        if (!from || !to) {
            return [];
        }
        if (from === to) {
            return [];
        }

        const tokenAddress = tokenIdToAddressMaybe('Id', idOf(ev)) ?? null;
        const protocolCost = isProtocolCostBurn(ev);

        // Prefer the human-readable `circles` field when present (camelCase rows from
        // transactionHistory.ts already store CRC). Fall back to PascalCase Value/Values.
        if (typeof ev.circles === 'number' && Number.isFinite(ev.circles) && ev.circles !== 0) {
            return [{ from, to, amount: Math.abs(ev.circles), tokenAddress, isProtocolCost: protocolCost }];
        }

        const valueRaw = valueOf(ev);
        if (valueRaw !== undefined && valueRaw !== null && valueRaw !== '0') {
            const amount = toCirclesNumber(valueRaw);
            if (amount !== null && amount > 0) {
                return [{ from, to, amount, tokenAddress, isProtocolCost: protocolCost }];
            }
        }

        const valuesRaw = ev.Values ?? ev.values;
        if (Array.isArray(valuesRaw)) {
            const vals: unknown[] = valuesRaw;
            const sum = vals.reduce((acc: number, v: unknown) => {
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

    const transfers = $derived.by((): Transfer[] => {
        const all: Transfer[] = [];
        for (const ev of events) {
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

    const aggregatedTransfers = $derived.by((): AggregatedTransfer[] => {
        const map = new Map<string, { a: string; b: string; net: number; tokenAddress: string | null }>();

        for (const t of transfers) {
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

    const aggregatedBurnTransfers = $derived.by((): AggregatedTransfer[] => {
        const map = new Map<string, { a: string; b: string; net: number; tokenAddress: string | null }>();

        for (const t of transfers) {
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
    const netAmountForViewer = $derived.by((): number | null => {
        const me = avatarState.avatar?.address?.toLowerCase();
        if (!me) {
            return null;
        }
        let net = 0;
        for (const t of transfers) {
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
    const demurrageAmount = $derived.by((): number => {
        const me = avatarState.avatar?.address?.toLowerCase();
        if (!me) {
            return 0;
        }
        let net = 0;
        for (const t of transfers) {
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
    const demurrageAbs = $derived(Math.abs(demurrageAmount));

    // Header amount: intended transfers (excluding protocol fees).
    // Fallback to item.circles when no sub-events are available (flat SDK rows).
    const headerNetAmount = $derived.by(() => {
        // If we have sub-events with real transfer data, use that
        if (transfers.length > 0 && typeof netAmountForViewer === 'number') {
            return netAmountForViewer;
        }
        // Flat row from SDK — use circles field directly, apply sign based on direction
        const base = typeof item.circles === 'number' ? item.circles : Number(item.circles ?? 0);
        return sent ? -base : base;
    });

    const headerAbsAmount = $derived(Math.abs(headerNetAmount));
    const headerSign = $derived(headerNetAmount < 0 ? '-' : headerNetAmount > 0 ? '+' : '');
    const signedAmount = $derived.by(() => {
        const fmt = formatAmount(headerAbsAmount);
        if (fmt.startsWith('<') || fmt.startsWith('~')) {
            return `${headerSign} ${fmt}`;
        }
        return `${headerSign}${fmt}`;
    });
    const headerColorClass = $derived.by(() => {
        if (headerNetAmount < 0) {
            return 'text-error';
        }
        if (headerNetAmount > 0) {
            return 'text-success';
        }
        return 'text-base-content';
    });

    const nonBurnTransfers = $derived.by(() =>
        aggregatedTransfers.filter(t => !isZeroAddress(t.to))
    );

    // Burns are aggregated separately (including protocol-cost burns)
    const burnTransfers = $derived(aggregatedBurnTransfers);

    let burnsOpen = $state(false);
    function toggleBurns() {
        burnsOpen = !burnsOpen;
    }

    const totalBurned = $derived.by(() =>
        burnTransfers.reduce((acc: number, t: AggregatedTransfer) => acc + (t?.amount ?? 0), 0)
    );

    // Zero-sum swap detection for item.from vs item.to, ignoring protocol DiscountCost burns
    type SwapSummary = {
        forwardAmount: number;
        backwardAmount: number;
        forwardTokenAddress: string | null;
        backwardTokenAddress: string | null;
    };

    const swapSummary = $derived.by((): SwapSummary | null => {
        const fromAddr = item.from?.toLowerCase();
        const toAddr = item.to?.toLowerCase();
        if (!fromAddr || !toAddr) {
            return null;
        }

        // Only consider swaps when there is an actual stream between from→to
        let hasStreamBetween = false;
        for (const ev of events) {
            if (eventTypeOf(ev) !== 'CrcV2_StreamCompleted') {
                continue;
            }
            const evFrom = asAddressMaybe(fromOf(ev));
            const evTo = asAddressMaybe(toOf(ev));
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

        for (const t of transfers) {
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
    const mainTokenAddress = $derived.by((): string | null => {
        const fromAddr = item.from?.toLowerCase();
        const toAddr = item.to?.toLowerCase();
        if (!fromAddr || !toAddr) {
            return null;
        }
        for (const t of transfers) {
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
        if (k === '$type' || k === 'eventType') {
            return 'event Type';
        }
        // Capitalize first letter, then split camelCase/PascalCase
        const spaced = k
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/^Id$/i, 'ID');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    };

    // Support both PascalCase (old SDK) and camelCase (Nethermind RPC) event keys
    const primaryOrder = [
        '$', '$type', 'eventType',
        'Emitter', 'emitter', 'Operator', 'operator',
        'From', 'from', 'To', 'to',
        'Account', 'account', 'Sender', 'sender', 'Receiver', 'receiver',
        'Group', 'group', 'Id', 'id',
        'Value', 'value', 'Cost', 'cost', 'Amount', 'amount',
        'BatchIndex', 'batchIndex', 'LogIndex', 'logIndex',
    ];
    const hiddenKeys = new Set([
        'BlockNumber', 'blockNumber',
        'Timestamp', 'timestamp',
        'TransactionIndex', 'transactionIndex',
        'TransactionHash', 'transactionHash',
        // Redundant with the header event label
        '$type', 'eventType',
        // Internal fields already shown elsewhere
        'circles', 'crc', 'staticCircles', 'version',
    ]);
    const eventDisplayEntries = (ev: TxEvent): [string, any][] => {
        const entries: [string, any][] = Object.entries(ev)
            .filter(([k, v]) => !hiddenKeys.has(k) && v !== undefined && v !== null);
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
                        <div class={`text-3xl sm:text-4xl font-extrabold ${headerColorClass}`}>
                            {signedAmount} <span class="opacity-70 text-base align-middle">CRC</span>
                        </div>
                    </div>
                    {#if demurrageAbs > 0}
                        <div class="mt-1 text-sm font-semibold text-error">
                            -{formatAmount(demurrageAbs)}
                            <span class="opacity-70 text-xs align-middle"> CRC demurrage</span>
                        </div>
                    {/if}
                </div>

                <div class="p-3">
                    {#if swapSummary}
                        <div class="space-y-2">
                            <!-- Forward leg -->
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2 min-w-0">
                                    <Avatar address={item.from} view="horizontal" clickable={true} />
                                </div>
                                <div class="shrink-0 flex items-center gap-2 text-base-content/70">
                                    {#if swapSummary?.forwardTokenAddress}
                                        <Avatar address={swapSummary.forwardTokenAddress} view="small_no_text" clickable={true} />
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
                                    {#if swapSummary?.backwardTokenAddress}
                                        <Avatar address={swapSummary.backwardTokenAddress} view="small_no_text" clickable={true} />
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
                                {#if mainTokenAddress}
                                    <Avatar address={mainTokenAddress} view="small_no_text" clickable={true} />
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
                        <div class="text-sm">{dateTime}</div>
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

            {#if aggregatedTransfers.length}
                <div class="bg-base-100 border mt-4 rounded-xl overflow-hidden">
                    <div class="p-3 border-b">
                        <div class="text-sm opacity-70">
                            Aggregated transfers <span class="opacity-60">({aggregatedTransfers.length})</span>
                        </div>
                    </div>
                    <div class="divide-y">
                        {#each nonBurnTransfers as t}
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
                                        <Avatar address={t.to} view="small" clickable={true} />
                                    </div>
                                </div>
                            </div>
                        {/each}
                        {#if burnTransfers.length}
                            <button
                                    class="w-full p-3 bg-base-200/50 text-xs uppercase tracking-wide text-base-content/60 flex items-center justify-between hover:bg-base-200/70 transition-colors"
                                    onclick={toggleBurns}
                                    aria-expanded={burnsOpen}
                                    title={burnsOpen ? 'Hide burns' : 'Show burns'}
                            >
                                <span>
                                    Burns <span class="opacity-60">({burnTransfers.length})</span>
                                </span>
                                <span class="text-[11px] normal-case opacity-80">
                                    {formatAmount(totalBurned)} <span class="opacity-70">CRC</span>
                                </span>
                            </button>
                            {#if burnsOpen}
                                {#each burnTransfers as t}
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
                events={events}
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
