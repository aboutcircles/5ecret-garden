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
    import TxBreakdown from './TxBreakdown.svelte';
    import { annotationsByTx } from '$lib/shared/state/transferAnnotations';
    import { popupControls } from '$lib/shared/state/popup';
    import JumpPopup from '$lib/shared/ui/content/jump/JumpPopup.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import {
        buildTxBreakdown,
        deriveBlockNumber,
        fetchTxEvents,
        type BreakdownLeg,
    } from '$lib/shared/utils/txBreakdown';
    import { getProfile } from '$lib/shared/utils/profile';
    import { getActiveConfig } from '$lib/shared/state/settings.svelte';

    interface Props { item: TransactionHistoryRow }
    let { item }: Props = $props();

    // Transfer-data annotations attached to this transaction (note/message carried on a transfer).
    // Keyed by transaction hash; only those that decode to readable text are shown.
    const txAnnotations = $derived(
        ($annotationsByTx.get(item.transactionHash?.toLowerCase() ?? '') ?? [])
            .filter((a) => a.text)
    );

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
        return abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    // --- Granular "What happened" breakdown (circles_events enhancement) ---
    // The aggregated history RPC collapses personal mint + group mint + wrap + collateral +
    // demurrage into one summary. circles_events exposes the granular legs; we fetch them for
    // this tx's block and classify them. Purely additive: any failure falls back to the
    // existing aggregated rendering below.
    let breakdownLegs = $state<BreakdownLeg[]>([]);
    let breakdownLoading = $state(false);
    // True when this tx routes through the migration sink. Tracked separately from the legs
    // because migration hops are folded into the "Transfers (N)" summary's children, so the
    // top-level legs array no longer carries a literal "Group migration" label to scan for.
    let breakdownIsMigration = $state(false);
    // group address (lowercase) -> resolved display name, for labeling group-mint legs.
    let groupNames = $state<Map<string, string>>(new Map());

    $effect(() => {
        // Re-run whenever the viewed tx changes.
        const txHash = item.transactionHash;
        const me = avatarState.avatar?.address;
        breakdownLegs = [];
        breakdownIsMigration = false;
        groupNames = new Map();
        if (!txHash || !me) {
            return;
        }
        const block = deriveBlockNumber((item as ItemWithEvents)?.events);
        if (block === null) {
            return;
        }

        // Single source of truth for the migration sink: the active config (the list row reads
        // the same field), so the row and this breakdown can never disagree on what's a migration.
        const migrationSink = getActiveConfig().scoreGroupMigrationSink ?? null;

        let cancelled = false;
        breakdownLoading = true;
        (async () => {
            const raw = await fetchTxEvents(me, block, txHash);
            if (cancelled) {
                return;
            }
            const nameLookup = (addr: string): string | null =>
                groupNames.get(addr.toLowerCase()) ?? null;
            const result = buildTxBreakdown(raw, me, nameLookup, migrationSink);
            if (cancelled) {
                return;
            }
            // Only show the breakdown when it tells us more than the aggregated view —
            // i.e. there is more than one leg, or a mint/migration we can label specially.
            const worthShowing =
                result.legs.length > 1 || result.isGroupMint || result.isMigration;
            breakdownLegs = worthShowing ? result.legs : [];
            breakdownIsMigration = worthShowing && result.isMigration;
            breakdownLoading = false;

            // Resolve group names asynchronously, then re-label the affected legs.
            const groupAddrs = new Set<string>();
            for (const leg of result.legs) {
                if (leg.label.startsWith('Group mint') && leg.counterparty) {
                    groupAddrs.add(leg.counterparty.toLowerCase());
                }
            }
            for (const addr of groupAddrs) {
                try {
                    const profile = await getProfile(addr as `0x${string}`);
                    if (cancelled || !profile?.name) {
                        continue;
                    }
                    const next = new Map(groupNames);
                    next.set(addr, profile.name);
                    groupNames = next;
                } catch {
                    // Non-fatal: leave the generic "Group mint" label.
                }
            }
            if (cancelled || groupAddrs.size === 0) {
                return;
            }
            // Re-build with the now-resolved names so labels pick them up.
            const relabeled = buildTxBreakdown(raw, me, nameLookup, migrationSink);
            if (!cancelled) {
                const relabeledWorth =
                    relabeled.legs.length > 1 || relabeled.isGroupMint || relabeled.isMigration;
                breakdownLegs = relabeledWorth ? relabeled.legs : [];
                breakdownIsMigration = relabeledWorth && relabeled.isMigration;
            }
        })().catch((error) => {
            // fetchTxEvents never throws, so anything reaching here is an unexpected defect in
            // the breakdown build / name resolution — surface it rather than dropping it silently.
            console.error('[txBreakdown] breakdown effect failed', error);
            if (!cancelled) {
                breakdownLoading = false;
            }
        });

        return () => {
            cancelled = true;
        };
    });

    // Title off the builder's isMigration flag (computed from the raw legs before folding), not a
    // label scan — migration hops are now folded into the "Transfers (N)" summary's children.
    const breakdownTitle = $derived(breakdownIsMigration ? 'Group migration' : 'What happened');

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
    const headerColor = $derived.by(() => {
        if (headerNetAmount < 0) {
            return T.negative;
        }
        if (headerNetAmount > 0) {
            return T.positive;
        }
        return T.ink;
    });
    const headerGradient = $derived.by(() => {
        if (headerNetAmount < 0) {
            return `linear-gradient(160deg, ${T.coralSoft} 0%, ${T.surface} 100%)`;
        }
        if (headerNetAmount > 0) {
            return `linear-gradient(160deg, ${T.sageSoft} 0%, ${T.surface} 100%)`;
        }
        return `linear-gradient(160deg, ${T.lilacSoft} 0%, ${T.surface} 100%)`;
    });
    const headerEyebrow = $derived.by(() => {
        const fromIsZero = isZeroAddress(item.from);
        const toIsZero = isZeroAddress(item.to);
        if (fromIsZero) return 'You minted';
        if (toIsZero) return 'You burned';
        if (headerNetAmount > 0) return 'You received';
        if (headerNetAmount < 0) return 'You sent';
        return 'Transaction';
    });

    // Direction text must agree with the signed header amount. Deriving "sent" purely from
    // `item.from === me` contradicts the headline for self-counterparty / synthesized rows
    // (e.g. a positive "received" headline while the direction said "You sent this").
    const directionLabel = $derived(
        headerNetAmount < 0 ? 'You sent this'
        : headerNetAmount > 0 ? 'You received this'
        // Net zero can be a true self-transfer OR a pass-through hop (from ≠ to), so avoid
        // asserting "Self-transfer"; "No net change" is honest for both.
        : 'No net change'
    );

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

<div style="display:flex;flex-direction:column;width:100%;gap:14px;">
    <!-- Hero amount card -->
    <div style="
        background:{headerGradient};border:1px solid {T.hairlineSoft};border-radius:18px;overflow:hidden;
        box-shadow:{T.shadow.xs};
    ">
        <div style="padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <span style="font-size:11.5px;font-weight:600;color:{headerColor};letter-spacing:0.06em;text-transform:uppercase;opacity:0.85;">
                {headerEyebrow}
            </span>
            <span style="font-family:{T.fontDisplay};font-size:48px;color:{headerColor};letter-spacing:-0.02em;line-height:1;font-weight:400;">
                {signedAmount}<span style="font-family:{T.fontSans};font-size:16px;color:{T.inkMuted};font-weight:540;margin-left:6px;">CRC</span>
            </span>
            {#if demurrageAbs > 0}
                <span style="font-size:12px;color:{T.negative};font-weight:540;">
                    −{formatAmount(demurrageAbs)} CRC demurrage
                </span>
            {/if}
        </div>

        <div style="padding:14px 16px;border-top:1px solid {T.hairlineSoft};background:{T.surface};">
            {#if swapSummary}
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <!-- Forward leg -->
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <div style="min-width:0;flex:1;"><Avatar address={item.from} view="horizontal" clickable={true} /></div>
                        <div style="display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};flex-shrink:0;">
                            {#if swapSummary?.forwardTokenAddress}
                                <Avatar address={swapSummary.forwardTokenAddress} view="small_no_text" clickable={true} />
                            {/if}
                            <Icon name="arrowRight" size={14} stroke={T.inkMuted} />
                        </div>
                        <div style="min-width:0;flex:1;display:flex;justify-content:flex-end;"><Avatar address={item.to} view="horizontal" clickable={true} /></div>
                    </div>
                    <!-- Return leg -->
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <div style="min-width:0;flex:1;"><Avatar address={item.from} view="horizontal" clickable={true} /></div>
                        <div style="display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};flex-shrink:0;">
                            {#if swapSummary?.backwardTokenAddress}
                                <Avatar address={swapSummary.backwardTokenAddress} view="small_no_text" clickable={true} />
                            {/if}
                            <span style="display:inline-block;transform:rotate(180deg);"><Icon name="arrowRight" size={14} stroke={T.inkMuted} /></span>
                        </div>
                        <div style="min-width:0;flex:1;display:flex;justify-content:flex-end;"><Avatar address={item.to} view="horizontal" clickable={true} /></div>
                    </div>
                </div>
            {:else}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="min-width:0;flex:1;"><Avatar address={item.from} view="horizontal" clickable={true} /></div>
                    <div style="display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};flex-shrink:0;">
                        {#if mainTokenAddress}
                            <Avatar address={mainTokenAddress} view="small_no_text" clickable={true} />
                        {/if}
                        <Icon name="arrowRight" size={14} stroke={T.inkMuted} />
                    </div>
                    <div style="min-width:0;flex:1;display:flex;justify-content:flex-end;"><Avatar address={item.to} view="horizontal" clickable={true} /></div>
                </div>
                <div style="margin-top:10px;padding-top:10px;border-top:1px solid {T.hairlineSoft};display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Direction</span>
                    <span style="font-size:12.5px;color:{T.inkBody};font-weight:540;">{directionLabel}</span>
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

    {#if txAnnotations.length}
        <!-- Transfer note(s) -->
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
            <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};">
                <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                    {txAnnotations.length > 1 ? 'Notes' : 'Note'}
                </span>
            </div>
            {#each txAnnotations as a, i (i)}
                <div style="padding:10px 14px;{i > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}">
                    <span style="font-size:13px;color:{T.inkBody};white-space:pre-wrap;word-break:break-word;">{a.text}</span>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Details table -->
    <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Date &amp; time</span>
            <span style="font-size:12.5px;color:{T.ink};">{dateTime}</span>
        </div>
        <div style="padding:10px 14px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;flex-shrink:0;">Tx hash</span>
            <div style="flex:1;min-width:0;">
                <div style="font-family:{T.fontMono};font-size:11px;color:{T.inkBody};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title={item.transactionHash}>{item.transactionHash}</div>
            </div>
            <div style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;">
                <button
                    type="button"
                    style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
                    onclick={copyHash}
                    title="Copy hash"
                ><Icon name="copy" size={10} stroke={T.inkMuted} /> Copy</button>
                <button
                    type="button"
                    style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:11px;font-weight:580;cursor:pointer;box-shadow:0 2px 6px rgba(88,73,212,0.2);"
                    onclick={openOnExplorer}
                    title="Open on Gnosisscan"
                ><Icon name="external" size={10} stroke="#fff" /> Open</button>
            </div>
        </div>
    </div>

    {#if breakdownLegs.length}
        <!-- Truthful per-leg breakdown from circles_events (mints, wraps, collateral, demurrage). -->
        <TxBreakdown legs={breakdownLegs} title={breakdownTitle} />
    {:else if breakdownLoading}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:10px 14px;">
            <span style="font-size:11px;color:{T.inkFaint};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                Loading breakdown…
            </span>
        </div>
    {/if}

    {#if aggregatedTransfers.length}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
            <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};">
                <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                    Aggregated transfers <span style="color:{T.inkFaint};">({aggregatedTransfers.length})</span>
                </span>
            </div>
            {#each nonBurnTransfers as t, ri (ri)}
                <div style="padding:10px 14px;{ri > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}display:flex;align-items:center;gap:10px;">
                    <div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;">
                        {#if isZeroAddress(t.from)}
                            <div style="width:24px;height:24px;border-radius:9999px;background:{T.sageSoft};display:inline-flex;align-items:center;justify-content:center;" title="Minted">
                                <Lucide icon={LCoins} size={12} class="text-success" />
                            </div>
                        {:else}
                            <Avatar address={t.from} view="small" clickable={true} />
                        {/if}
                    </div>
                    <span style="flex-shrink:0;min-width:88px;text-align:right;font-size:13px;font-weight:580;color:{T.ink};font-variant-numeric:tabular-nums;white-space:nowrap;">
                        {formatAmount(t.amount)}<span style="color:{T.inkMuted};font-weight:540;margin-left:3px;">CRC</span>
                    </span>
                    <div style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};">
                        {#if t.tokenAddress}
                            <Avatar address={t.tokenAddress} view="small_no_text" clickable={true} />
                        {/if}
                        <div style="width:22px;height:22px;border-radius:9999px;background:{T.pageDeep};display:inline-flex;align-items:center;justify-content:center;">
                            <Icon name="arrowRight" size={11} stroke={T.inkMuted} />
                        </div>
                    </div>
                    <div style="flex:1;min-width:0;display:flex;justify-content:flex-end;">
                        <Avatar address={t.to} view="small_reverse" clickable={true} />
                    </div>
                </div>
            {/each}
            {#if burnTransfers.length}
                <button
                    type="button"
                    style="width:100%;padding:10px 14px;border-top:1px solid {T.hairlineSoft};background:{T.surfaceAlt};border-left:0;border-right:0;border-bottom:0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;color:{T.inkMuted};"
                    onclick={toggleBurns}
                    aria-expanded={burnsOpen}
                    title={burnsOpen ? 'Hide burns' : 'Show burns'}
                >
                    <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                        Burns <span style="color:{T.inkFaint};">({burnTransfers.length})</span>
                    </span>
                    <span style="font-size:11.5px;color:{T.inkBody};font-variant-numeric:tabular-nums;">
                        {formatAmount(totalBurned)}<span style="color:{T.inkMuted};margin-left:3px;">CRC</span>
                    </span>
                </button>
                {#if burnsOpen}
                    {#each burnTransfers as t (t.from + t.to + t.amount)}
                        <div style="padding:10px 14px;border-top:1px solid {T.hairlineSoft};display:flex;align-items:center;gap:10px;">
                            <div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;">
                                {#if isZeroAddress(t.from)}
                                    <div style="width:24px;height:24px;border-radius:9999px;background:{T.sageSoft};display:inline-flex;align-items:center;justify-content:center;">
                                        <Lucide icon={LCoins} size={12} class="text-success" />
                                    </div>
                                {:else}
                                    <Avatar address={t.from} view="small" clickable={true} />
                                {/if}
                            </div>
                            <span style="flex-shrink:0;min-width:88px;text-align:right;font-size:13px;font-weight:580;color:{T.ink};font-variant-numeric:tabular-nums;white-space:nowrap;">
                                {formatAmount(t.amount)}<span style="color:{T.inkMuted};font-weight:540;margin-left:3px;">CRC</span>
                            </span>
                            <div style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};">
                                {#if t.tokenAddress}
                                    <Avatar address={t.tokenAddress} view="small_no_text" clickable={true} />
                                {/if}
                                <div style="width:22px;height:22px;border-radius:9999px;background:{T.pageDeep};display:inline-flex;align-items:center;justify-content:center;">
                                    <Icon name="arrowRight" size={11} stroke={T.inkMuted} />
                                </div>
                            </div>
                            <div style="flex:1;min-width:0;display:flex;justify-content:flex-end;">
                                <div style="width:24px;height:24px;border-radius:9999px;background:{T.negativeSoft};display:inline-flex;align-items:center;justify-content:center;" title="Burned">
                                    <Lucide icon={LFlame} size={12} class="text-error" />
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}
        </div>
    {/if}
</div>

<style>
    /* No bespoke theme here; rely on Tailwind/DaisyUI to match the app. */
</style>
