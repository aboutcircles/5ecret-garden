import { get } from 'svelte/store';
import { CirclesConverter } from '@aboutcircles/sdk-utils';
import { circles } from '$lib/shared/state/circles';
import { isAddress, isZeroAddress, toBigIntMaybe, tokenIdToAddressMaybe } from '$lib/shared/utils/tx';

/**
 * Truthful "What happened" breakdown for a Circles transaction.
 *
 * The transaction-history RPC (`circles_getTransactionHistory…`) only returns AGGREGATED
 * `CrcV2_TransferSummary` rows, which collapse personal mint + group mint + wrap + collateral +
 * demurrage into a single `0x0 → you` summary. That is enough for a net number but hides what
 * actually happened — especially for score-group mints and legacy-group migrations.
 *
 * The only RPC that exposes the granular event types is `circles_events`. It filters by
 * (address + block range), not by tx hash, so we fetch all events in the tx's block for the
 * avatar and then keep only the rows whose `transactionHash` matches.
 *
 * This is a pure ENHANCEMENT: if the fetch fails, the block is unknown, or nothing classifies,
 * callers must fall back to the existing aggregated rendering. We never throw to the caller.
 */

/** A single raw `circles_events` row: `{ event, values }`. */
interface RawCirclesEvent {
    event: string;
    values: Record<string, unknown>;
}

/**
 * One classified leg of the breakdown. `amount` is in CRC (UI units, always positive);
 * `sign` records whether it added to or subtracted from the avatar's holdings (or is neutral).
 *
 * A leg is normally an individual hop (`kind` omitted or `'leg'`). A `kind: 'group'` leg is a
 * synthetic SUMMARY row standing in for a folded tail of minor flow legs: its `children` hold the
 * folded legs and the UI renders it as an expandable "Transfers (N)" row. The summary sentinel is
 * emitted inside `legs` (rather than as a separate return field) so the popup's existing
 * `<TxBreakdown legs={…}>` contract keeps working without any change there.
 */
export interface BreakdownLeg {
    /** Human label, e.g. "Personal mint", "Group mint", "Wrapped", "Collateral", "Demurrage". */
    label: string;
    /** Positive CRC amount for the leg (for a `group` leg this is the absolute net of children). */
    amount: number;
    /** Sign relative to the viewing avatar. */
    sign: 'plus' | 'minus' | 'neutral';
    /** Token contract address for this leg, if resolvable (for the small token avatar). */
    tokenAddress: string | null;
    /** Counterparty address to show alongside the leg, if meaningful (e.g. group, treasury). */
    counterparty: string | null;
    /** A stable-enough key for keyed `{#each}`. */
    key: string;
    /** Discriminator. Absent / `'leg'` = a normal hop; `'group'` = a collapsed summary row. */
    kind?: 'leg' | 'group';
    /** For `kind: 'group'`: the individual minor flow legs folded under this summary. */
    children?: BreakdownLeg[];
}

/** Result of {@link buildTxBreakdown}. `kind` lets the UI title the section appropriately. */
export interface TxBreakdown {
    /**
     * Ordered prominent legs for display. Semantic legs (mints / wrap / collateral / demurrage)
     * come first in priority order, followed by prominent flow legs. When the flow tail is folded,
     * the LAST entry is a synthetic `kind: 'group'` summary leg carrying the folded legs in
     * `children` — the popup passes this array straight to `<TxBreakdown legs={…}>` unchanged.
     */
    legs: BreakdownLeg[];
    /** The folded minor flow legs (same legs as the summary's `children`); empty when nothing folds. */
    minorLegs: BreakdownLeg[];
    /** Signed CRC sum of `minorLegs` relative to the viewer (plus adds, minus subtracts). */
    minorNet: number;
    /** True when any leg routes through the migration SinkWrapper. */
    isMigration: boolean;
    /** True when a group-mint leg is present (score / standard group mint). */
    isGroupMint: boolean;
}

// --- Verified Gnosis-mainnet protocol addresses (public). Used only to LABEL legs. ---
// The migration sink is intentionally NOT hardcoded here — it is threaded in from the active
// config (`scoreGroupMigrationSink`), the same field the list row reads, so the row label and
// this breakdown share one source of truth and cannot drift if the deployed sink ever changes.
const TREASURY = '0xe445f8b377f7689d2987920d51b8bba21b6241ce'; // parent treasury (collateral sink)
const HUB_V2 = '0xc12c1e50abb450d6205ea2c3fa861b3b834d13e8';
const LIFT_ERC20 = '0x5f99a795dd2743c36d63511f0d4bc667e6d3cdb5';

// Inflationary ("static") wrapper deposit/withdraw events deal in static-circles atto units,
// not demurraged atto-circles. Converting them with the demurraged converter still yields a
// value of the right order of magnitude for display; the wrap label is what matters here.

const lc = (v: unknown): string | null => (isAddress(v) ? String(v).toLowerCase() : null);

/** Convert a raw value (hex string / decimal string / number / bigint) to CRC UI units. */
function toCircles(val: unknown): number | null {
    if (typeof val === 'number' && Number.isFinite(val)) {
        return val;
    }
    const bi = toBigIntMaybe(val);
    if (bi !== null) {
        try {
            const c = CirclesConverter.attoCirclesToCircles(bi);
            return Number.isFinite(c) ? c : null;
        } catch {
            return null;
        }
    }
    return null;
}

/** Accessors that tolerate both camelCase (`circles_events`) and PascalCase shapes. */
const ev = {
    type: (e: RawCirclesEvent): string => String(e.event ?? ''),
    from: (e: RawCirclesEvent): unknown => e.values?.from ?? e.values?.From,
    to: (e: RawCirclesEvent): unknown => e.values?.to ?? e.values?.To,
    id: (e: RawCirclesEvent): unknown => e.values?.id ?? e.values?.Id,
    value: (e: RawCirclesEvent): unknown =>
        e.values?.value ?? e.values?.Value ?? e.values?.amount ?? e.values?.Amount,
    account: (e: RawCirclesEvent): unknown => e.values?.account ?? e.values?.Account,
    group: (e: RawCirclesEvent): unknown => e.values?.group ?? e.values?.Group,
    cost: (e: RawCirclesEvent): unknown => e.values?.cost ?? e.values?.Cost,
    txHash: (e: RawCirclesEvent): string =>
        String(e.values?.transactionHash ?? e.values?.TransactionHash ?? ''),
    blockNumber: (e: RawCirclesEvent): unknown => e.values?.blockNumber ?? e.values?.BlockNumber,
};

const tokenAddressOf = (e: RawCirclesEvent): string | null =>
    tokenIdToAddressMaybe('id', ev.id(e)) ?? tokenIdToAddressMaybe('Id', ev.id(e)) ?? null;

/**
 * Fetch the granular `circles_events` for the tx's block, keep only the rows whose
 * `transactionHash` matches `txHash` (case-insensitive). Returns `[]` on any failure.
 *
 * Call shape (verified against the prior raw integration):
 *   circles_events(address, fromBlock, toBlock, eventTypes, filterPredicates, sortAscending, limit, cursor)
 * The result is a plain array of `{ event, values }`; `values` carries camelCase keys with hex
 * string numerics (`from`, `to`, `value`, `id`, `transactionHash`, `blockNumber`, …).
 */
export async function fetchTxEvents(
    avatarAddress: string,
    blockNumber: number,
    txHash: string
): Promise<RawCirclesEvent[]> {
    if (!isAddress(avatarAddress) || !Number.isFinite(blockNumber) || blockNumber <= 0 || !txHash) {
        return [];
    }
    const sdk = get(circles);
    if (!sdk?.rpc?.client) {
        return [];
    }

    // Only the RPC round-trip is an expected failure point (network/transport). A blip here is
    // normal and falls back to the aggregated view, so swallow it. The deterministic response
    // processing below is kept OUTSIDE the catch on purpose: a malformed response shape or a
    // parsing defect should reject up to the caller (which logs it as a defect) rather than be
    // silently mistaken for a transient network failure.
    let raw: unknown;
    try {
        raw = await sdk.rpc.client.call<unknown[], unknown>('circles_events', [
            avatarAddress,
            blockNumber,
            blockNumber,
            null,
            null,
            true,
            null,
            null,
        ]);
    } catch (error) {
        console.warn(
            '[txBreakdown] circles_events fetch failed',
            { avatarAddress, blockNumber, txHash },
            error
        );
        return [];
    }

    const rows: unknown[] = Array.isArray(raw)
        ? raw
        : ((raw as { events?: unknown[]; results?: unknown[] })?.events ??
          (raw as { events?: unknown[]; results?: unknown[] })?.results ??
          []);

    const wantHash = txHash.toLowerCase();
    const out: RawCirclesEvent[] = [];
    for (const r of rows) {
        if (!r || typeof r !== 'object') {
            continue;
        }
        const row = r as RawCirclesEvent;
        if (!row.values || typeof row.values !== 'object') {
            continue;
        }
        if (ev.txHash(row).toLowerCase() !== wantHash) {
            continue;
        }
        out.push(row);
    }
    return out;
}

/**
 * Resolve the block number for a tx from its already-inferred `item.events`.
 * Those rows store `blockNumber` directly (decimal); fall back to scanning all of them.
 */
export function deriveBlockNumber(itemEvents: unknown): number | null {
    if (!Array.isArray(itemEvents)) {
        return null;
    }
    for (const e of itemEvents) {
        if (!e || typeof e !== 'object') {
            continue;
        }
        const bn = (e as { blockNumber?: unknown; BlockNumber?: unknown }).blockNumber
            ?? (e as { blockNumber?: unknown; BlockNumber?: unknown }).BlockNumber;
        const n = typeof bn === 'number' ? bn : Number(toBigIntMaybe(bn) ?? NaN);
        if (Number.isFinite(n) && n > 0) {
            return n;
        }
    }
    return null;
}

/**
 * Classify the granular events of ONE transaction into labeled legs, from the viewpoint of
 * `avatarAddress`. Conservative by design: a leg that cannot be confidently classified is shown
 * as a neutral transfer rather than mislabeled.
 */
export function buildTxBreakdown(
    rawEvents: RawCirclesEvent[],
    avatarAddress: string,
    groupNameFor?: (address: string) => string | null,
    migrationSink?: string | null
): TxBreakdown {
    const me = lc(avatarAddress);
    // The migration sink comes from config (single source of truth). When absent (networks
    // without score-group support), migration legs simply fall through to a neutral transfer.
    const sink = migrationSink ? migrationSink.toLowerCase() : null;
    // Classified in raw chain order first; ordering + collapse happen afterwards.
    const legs: BreakdownLeg[] = [];
    let isMigration = false;
    let isGroupMint = false;

    // Pre-aggregate DiscountCost burns so we can label them "Demurrage": (account|id) -> atto cost.
    const discountCost = new Map<string, bigint>();
    for (const e of rawEvents) {
        if (ev.type(e) !== 'CrcV2_DiscountCost') {
            continue;
        }
        const acct = lc(ev.account(e));
        const id = ev.id(e);
        const cost = toBigIntMaybe(ev.cost(e));
        if (!acct || id === undefined || cost === null) {
            continue;
        }
        const key = `${acct}|${String(id)}`;
        discountCost.set(key, (discountCost.get(key) ?? 0n) + cost);
    }

    const touchesSink = (a: string | null, b: string | null): boolean =>
        sink !== null && (a === sink || b === sink);

    let i = 0;
    for (const e of rawEvents) {
        const type = ev.type(e);
        const from = lc(ev.from(e));
        const to = lc(ev.to(e));
        const tokenAddress = tokenAddressOf(e);
        const key = `${type}|${i++}`;

        if (type === 'CrcV2_PersonalMint') {
            const amount = toCircles(ev.value(e));
            if (amount && amount > 0) {
                legs.push({ label: 'Personal mint', amount, sign: 'plus', tokenAddress, counterparty: null, key });
            }
            continue;
        }

        if (type === 'CrcV2_GroupMint') {
            isGroupMint = true;
            const groupRaw = lc(ev.group(e)) ?? to;
            const amount = toCircles(ev.value(e));
            const name = groupRaw && groupNameFor ? groupNameFor(groupRaw) : null;
            if (amount && amount > 0) {
                legs.push({
                    label: name ? `Group mint (${name})` : 'Group mint',
                    amount,
                    sign: 'plus',
                    tokenAddress,
                    counterparty: groupRaw,
                    key,
                });
            }
            continue;
        }

        // Wrap (lift to ERC-20). Inflationary = static wrapper (s-gCRC), Demurraged = demurrage wrapper.
        if (type === 'CrcV2_DepositInflationary' || type === 'CrcV2_DepositDemurraged') {
            const amount = toCircles(ev.value(e));
            if (amount && amount > 0) {
                legs.push({ label: 'Wrapped', amount, sign: 'neutral', tokenAddress, counterparty: to, key });
            }
            continue;
        }

        // Unwrap (withdraw back to ERC-1155).
        if (type === 'CrcV2_WithdrawInflationary' || type === 'CrcV2_WithdrawDemurraged') {
            const amount = toCircles(ev.value(e));
            if (amount && amount > 0) {
                legs.push({ label: 'Unwrapped', amount, sign: 'neutral', tokenAddress, counterparty: from, key });
            }
            continue;
        }

        // Value-bearing transfers (ERC-1155 single / generic Transfer / wrapper transfer / burns).
        const isTransferLike =
            type === 'CrcV2_TransferSingle'
            || type === 'CrcV2_Transfer'
            || type === 'CrcV2_Erc20WrapperTransfer'
            || type === 'CrcV2_GroupRedeemCollateralBurn'
            || type === 'CrcV2_GroupRedeemCollateralReturn';

        if (!isTransferLike) {
            continue;
        }
        if (!from || !to || from === to) {
            continue;
        }

        const amount = toCircles(ev.value(e));
        if (!amount || amount <= 0) {
            continue;
        }

        // Protocol demurrage burn: a burn to 0x0 whose value matches an aggregated DiscountCost.
        if (isZeroAddress(to)) {
            const id = ev.id(e);
            const expected = id !== undefined ? discountCost.get(`${from}|${String(id)}`) : undefined;
            const valueBi = toBigIntMaybe(ev.value(e));
            if (expected !== undefined && valueBi !== null && expected === valueBi) {
                legs.push({ label: 'Demurrage', amount, sign: 'minus', tokenAddress, counterparty: null, key });
                continue;
            }
        }

        // Migration: any leg involving the SinkWrapper.
        if (touchesSink(from, to)) {
            isMigration = true;
            const sign: BreakdownLeg['sign'] = me && from === me ? 'minus' : me && to === me ? 'plus' : 'neutral';
            legs.push({
                label: 'Group migration',
                amount,
                sign,
                tokenAddress,
                counterparty: from === sink ? to : from,
                key,
            });
            continue;
        }

        // Collateral: a transfer to the parent treasury (collateral sink) during a mint.
        if (to === TREASURY) {
            legs.push({ label: 'Collateral', amount, sign: 'minus', tokenAddress, counterparty: to, key });
            continue;
        }

        // Plain burn (to 0x0) that is not a protocol-cost burn.
        if (isZeroAddress(to)) {
            legs.push({ label: 'Burned', amount, sign: 'minus', tokenAddress, counterparty: null, key });
            continue;
        }

        // Skip housekeeping legs to/from the hub or lift contract (not user-meaningful on their own).
        if (from === HUB_V2 || to === HUB_V2 || from === LIFT_ERC20 || to === LIFT_ERC20) {
            continue;
        }

        // Plain transfer — label relative to the avatar; otherwise neutral.
        let label = 'Transfer';
        let sign: BreakdownLeg['sign'] = 'neutral';
        let counterparty: string | null = null;
        if (me && from === me) {
            label = 'Sent';
            sign = 'minus';
            counterparty = to;
        } else if (me && to === me) {
            label = 'Received';
            sign = 'plus';
            counterparty = from;
        } else {
            counterparty = to;
        }
        legs.push({ label, amount, sign, tokenAddress, counterparty, key });
    }

    const { legs: orderedLegs, minorLegs, minorNet } = prioritizeAndCollapse(legs);
    return { legs: orderedLegs, minorLegs, minorNet, isMigration, isGroupMint };
}

// --- Prioritisation + collapse ---------------------------------------------------------------
// Semantic legs (the meaningful "what happened" steps) are shown first, in this priority order.
// "Group mint" matches by prefix because the live label is `Group mint (Name)` once resolved.
const SEMANTIC_ORDER = ['Personal mint', 'Group mint', 'Wrapped', 'Unwrapped', 'Collateral', 'Demurrage'];
// Flow legs are the noisy multi-hop tail emitted by flow-matrix settlement.
const FLOW_LABELS = new Set(['Sent', 'Received', 'Transfer', 'Burned', 'Group migration']);
// Below this leg count everything is shown verbatim (a clean mint must never collapse).
const COLLAPSE_THRESHOLD = 6;
// When there are NO semantic legs (a plain multi-hop transfer), keep this many of the largest
// flow legs prominent before folding the rest, so the headline hops stay visible.
const MAX_PROMINENT_FLOW = 3;

/** Priority index of a semantic label (prefix match for "Group mint"); -1 if not semantic. */
function semanticRank(label: string): number {
    for (let i = 0; i < SEMANTIC_ORDER.length; i++) {
        const s = SEMANTIC_ORDER[i];
        if (label === s || label.startsWith(`${s} (`)) {
            return i;
        }
    }
    return -1;
}

const isSemantic = (leg: BreakdownLeg): boolean => semanticRank(leg.label) >= 0;
const isFlow = (leg: BreakdownLeg): boolean => FLOW_LABELS.has(leg.label);

/** Signed contribution of a leg to the viewer's net (plus adds, minus subtracts, neutral 0). */
function signedAmount(leg: BreakdownLeg): number {
    if (leg.sign === 'plus') {
        return leg.amount;
    }
    if (leg.sign === 'minus') {
        return -leg.amount;
    }
    return 0;
}

/**
 * Order the prominent legs by importance and fold the long flow-matrix tail into one expandable
 * summary leg. Rules:
 *   • ≤ COLLAPSE_THRESHOLD legs → return them semantic-first, nothing folded.
 *   • otherwise prominent = ALL semantic legs (semantic-first), plus — only when there are no
 *     semantic legs at all — the largest MAX_PROMINENT_FLOW flow legs; everything else flow-typed
 *     is folded into a trailing `kind: 'group'` summary leg ("Transfers (N)").
 * Non-flow, non-semantic legs (should be rare) are always kept prominent so nothing meaningful is
 * hidden behind the toggle.
 */
function prioritizeAndCollapse(rawLegs: BreakdownLeg[]): {
    legs: BreakdownLeg[];
    minorLegs: BreakdownLeg[];
    minorNet: number;
} {
    const semantic = rawLegs.filter(isSemantic).sort((a, b) => semanticRank(a.label) - semanticRank(b.label));
    const flow = rawLegs.filter((l) => !isSemantic(l) && isFlow(l));
    const other = rawLegs.filter((l) => !isSemantic(l) && !isFlow(l));

    // Small transactions stay fully expanded, just reordered semantic-first.
    if (rawLegs.length <= COLLAPSE_THRESHOLD) {
        return { legs: [...semantic, ...other, ...flow], minorLegs: [], minorNet: 0 };
    }

    // Keep some flow legs prominent only when there is nothing semantic to anchor the view.
    let prominentFlow: BreakdownLeg[] = [];
    let foldedFlow = flow;
    if (semantic.length === 0) {
        const byAmount = [...flow].sort((a, b) => b.amount - a.amount);
        prominentFlow = byAmount.slice(0, MAX_PROMINENT_FLOW);
        const keep = new Set(prominentFlow);
        foldedFlow = flow.filter((l) => !keep.has(l));
    }

    // Nothing actually folds (e.g. only 1 flow leg over threshold) → behave like the small case.
    if (foldedFlow.length <= 1) {
        return { legs: [...semantic, ...other, ...prominentFlow, ...foldedFlow], minorLegs: [], minorNet: 0 };
    }

    const minorNet = foldedFlow.reduce((acc, l) => acc + signedAmount(l), 0);
    const sign: BreakdownLeg['sign'] = minorNet > 1e-9 ? 'plus' : minorNet < -1e-9 ? 'minus' : 'neutral';
    const summary: BreakdownLeg = {
        label: `Transfers (${foldedFlow.length})`,
        amount: Math.abs(minorNet),
        sign,
        tokenAddress: null,
        counterparty: null,
        key: `summary|${foldedFlow.length}`,
        kind: 'group',
        children: foldedFlow,
    };

    return {
        legs: [...semantic, ...other, ...prominentFlow, summary],
        minorLegs: foldedFlow,
        minorNet,
    };
}
