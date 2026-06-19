import { get } from 'svelte/store';
import type { Sdk } from '@aboutcircles/sdk';
import { circles } from '$lib/shared/state/circles';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';
import {
    createAvatarDataSource,
    getAvatarInfoCached,
} from '$lib/shared/data/circles/avatarDataSource';
import type { Address } from '@aboutcircles/sdk-types';
import type { PagedResponse, EnrichedTransaction } from '$lib/shared/utils/sdkHelpers';

/**
 * Dashboard flow metrics — time-horizon CRC flow split.
 *
 * The aggregated history RPC (`circles_getTransactionHistory`) returns per-leg
 * `TransferSummary` rows. Naively summing them counts VALUE-NEUTRAL conversions
 * (split-mint collateral, wrap/lift to ERC-20, legacy-group migration) as losses,
 * which produced the misleading "−57 today" pill. This engine classifies every leg
 * into exactly one visible bucket so that:
 *
 *   NET = Minted + Received − Sent − Spent − Demurrage
 *
 * and Converted is a separate NEUTRAL line that never touches NET (its in/out legs do
 * not pair in aggregated history, so counting it would resurrect the bug). Every leg
 * still lands in exactly one bucket and is therefore visible — nothing is dropped.
 */

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Verified Gnosis-mainnet protocol address (public). The parent treasury / collateral
// sink for split-personal group mints — a value-neutral conversion target.
const TREASURY = '0xe445f8b377f7689d2987920d51b8bba21b6241ce';

const DAY_SECONDS = 86_400;

/** Selectable time horizon for the flow strip. */
export type FlowWindow = 'today' | '7d' | '30d' | 'all';

/** The named buckets every transaction leg lands in. */
export type FlowBucket =
    | 'minted'
    | 'received'
    | 'sent'
    | 'spent'
    | 'demurrage'
    | 'converted';

/** One contributing transaction leg, exposed for later drill-down (Phase E). */
export interface FlowTx {
    /** Transaction hash this leg belongs to. */
    hash: string;
    /** Positive CRC amount of the leg (always ≥ 0). */
    amount: number;
    /** The non-me counterparty address for the leg (zero address for mint/burn). */
    counterparty: string;
    /** Unix timestamp (seconds). */
    timestamp: number;
}

/** Per-window classified flow result. */
export interface FlowMetrics {
    /** Headline net for the window = minted + received − sent − spent − demurrage. */
    net: number;
    minted: number;
    received: number;
    sent: number;
    spent: number;
    demurrage: number;
    /** Neutral — value-preserving conversions; NOT part of `net`. */
    converted: number;
    /** Contributing legs per bucket (totals == sum of each bucket's amounts). */
    txByBucket: Record<FlowBucket, FlowTx[]>;
    /** True if the safety page cap was hit before reaching the 30-day boundary. */
    capped: boolean;
}

/** Empty/zeroed metrics for the loading / no-data case. */
export function emptyFlowMetrics(): FlowMetrics {
    return {
        net: 0,
        minted: 0,
        received: 0,
        sent: 0,
        spent: 0,
        demurrage: 0,
        converted: 0,
        txByBucket: {
            minted: [],
            received: [],
            sent: [],
            spent: [],
            demurrage: [],
            converted: [],
        },
        capped: false,
    };
}

// --- avatarKind classifier (cached) ----------------------------------------------------------

/**
 * The registered Circles kind of an address, or `null` when it is NOT a registered
 * Circles avatar (a wrapper / lift / treasury / other contract). `null` is the signal
 * the flow classifier uses to fold wrap/collateral/lift legs into the neutral
 * "Converted" bucket.
 */
export type AvatarKind = 'person' | 'organization' | 'group' | null;

// Module-level cache keyed by lowercased address. `null` results are cached too (so a
// confirmed non-avatar isn't re-queried), distinguished from "not yet looked up".
const avatarKindCache = new Map<string, AvatarKind>();

/** Map a Circles `avatarType` registration string to a coarse kind. */
function mapAvatarType(type: string | undefined): AvatarKind {
    switch (type) {
        case 'CrcV2_RegisterHuman':
        case 'CrcV1_Signup':
            return 'person';
        case 'CrcV2_RegisterOrganization':
        case 'CrcV1_OrganizationSignup':
            return 'organization';
        case 'CrcV2_RegisterGroup':
        case 'CrcV2_RegisterCustomGroup':
            return 'group';
        default:
            return null;
    }
}

/**
 * Resolve the {@link AvatarKind} of an address, cached.
 *
 * Data source: `sdk.data.getAvatar(address)` via the shared, already-cached
 * `createAvatarDataSource` — its `AvatarInfo.type` field carries the registration type
 * (`CrcV2_RegisterHuman` / `…RegisterOrganization` / `…RegisterGroup`). This is the same
 * source the rest of the app classifies avatars with (e.g. tokenClassification.ts), so the
 * flow strip cannot drift from the contacts / balances views. A not-found avatar or any
 * error resolves to `null` (treated as a conversion contract by the classifier).
 *
 * Never looks up the zero address.
 */
export async function avatarKind(address: string): Promise<AvatarKind> {
    const key = address.toLowerCase();
    if (key === ZERO_ADDRESS) return null;

    if (avatarKindCache.has(key)) {
        return avatarKindCache.get(key) ?? null;
    }

    // Fast path: an AvatarInfo already fetched elsewhere (Avatar renders, contacts, etc.).
    const cachedInfo = getAvatarInfoCached(key);
    if (cachedInfo) {
        const kind = mapAvatarType(cachedInfo.type);
        avatarKindCache.set(key, kind);
        return kind;
    }

    const sdk = get(circles);
    if (!sdk) {
        // No SDK yet — don't poison the cache; a later call may resolve.
        return null;
    }

    try {
        const info = await createAvatarDataSource(sdk).getAvatarInfo(address as Address);
        const kind = mapAvatarType(info?.type);
        avatarKindCache.set(key, kind);
        return kind;
    } catch {
        // Not a registered avatar / RPC error → conservative null (→ Converted bucket).
        avatarKindCache.set(key, null);
        return null;
    }
}

/** Clear the avatarKind cache (e.g. on logout). */
export function clearAvatarKindCache(): void {
    avatarKindCache.clear();
}

// --- leg parsing -----------------------------------------------------------------------------

interface FlowLeg {
    hash: string;
    timestamp: number;
    from: string;
    to: string;
    amount: number; // CRC, positive
}

function parseNumericValue(raw: unknown): number {
    if (raw == null) return 0;
    if (typeof raw === 'number') return raw;
    const str = String(raw).trim();
    if (!str || str === '0') return 0;
    if (str.startsWith('0x') || str.startsWith('0X')) {
        try {
            return Number(BigInt(str));
        } catch {
            return 0;
        }
    }
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
}

/** Extract a CRC amount from a raw enriched-transaction row (mirrors transactionHistory.ts). */
function extractCircles(tx: EnrichedTransaction): number {
    const raw = tx as unknown as Record<string, unknown>;
    const event = (raw['event'] as Record<string, unknown>) || {};
    const circlesVal = tx.circles || event['circles'] || raw['circles'];
    const crcVal = tx.crc || event['crc'] || raw['crc'];
    const attoCirclesVal = tx.attoCircles || event['attoCircles'] || raw['attoCircles'];
    const attoCrcVal = tx.attoCrc || event['attoCrc'] || raw['attoCrc'];
    const valueVal = tx.value || event['value'] || raw['value'] || '0';

    if (circlesVal && circlesVal !== '0') return parseNumericValue(circlesVal);
    if (crcVal && crcVal !== '0') return parseNumericValue(crcVal);
    if (attoCirclesVal && attoCirclesVal !== '0') return parseNumericValue(attoCirclesVal) / 1e18;
    if (attoCrcVal && attoCrcVal !== '0') return parseNumericValue(attoCrcVal) / 1e18;
    if (valueVal && valueVal !== '0') {
        const val = parseNumericValue(valueVal);
        return val > 1e15 ? val / 1e18 : val;
    }
    return 0;
}

function extractAddress(value: unknown): string | null {
    return typeof value === 'string' && value.length === 42 ? value.toLowerCase() : null;
}

/** Map an enriched-transaction row to a normalized leg, or `null` if unusable. */
function toLeg(tx: EnrichedTransaction): FlowLeg | null {
    const raw = tx as unknown as Record<string, unknown>;
    const event = (raw['event'] as Record<string, unknown>) || {};

    const from = extractAddress(
        tx.from || event['from'] || raw['from_address'] || event['from_address'] || raw['sender']
    );
    const to = extractAddress(
        tx.to || event['to'] || raw['to_address'] || event['to_address'] || raw['receiver']
    );
    // Drop unusable / self legs (from === to): a self-transfer is value-neutral and would
    // otherwise be misread as a counterparty leg, perturbing net.
    if (!from || !to || from === to) return null;

    const amount = extractCircles(tx);
    if (!(amount > 0)) return null;

    const timestamp = typeof tx.timestamp === 'number' ? tx.timestamp : Number(tx.timestamp) || 0;
    if (!timestamp) return null;

    return { hash: tx.transactionHash, timestamp, from, to, amount };
}

// --- fetching (window completeness) ----------------------------------------------------------

const PAGE_SIZE = 100;
/** Safety cap: never page more than this many legs even if 30 days isn't covered. */
const MAX_LEGS = 600;

/**
 * Fetch enriched per-leg history for `address`, paging via the cursor until either the
 * oldest fetched leg is older than (now − 30 days) OR the {@link MAX_LEGS} safety cap is
 * reached. Returns the legs plus a `capped` flag so the UI can surface "30d+".
 *
 * 30 days is the widest bounded window the strip needs (Today / 7d / 30d). "All" reuses
 * the same fetch — bounded by the cap — and is annotated as capped when the boundary
 * wasn't reached.
 */
async function fetchLegs(
    sdk: Sdk,
    address: string
): Promise<{ legs: FlowLeg[]; capped: boolean }> {
    const legs: FlowLeg[] = [];
    const boundaryTs = Math.floor(Date.now() / 1000) - 30 * DAY_SECONDS;

    let cursor: string | null = null;
    let capped = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const response = (await sdk.rpc.transaction.getTransactionHistory(
            address as Address,
            PAGE_SIZE,
            cursor
        )) as unknown as PagedResponse<EnrichedTransaction>;

        const rows = response?.results ?? [];
        if (rows.length === 0) break;

        let reachedBoundary = false;
        for (const row of rows) {
            const leg = toLeg(row);
            if (!leg) continue;
            legs.push(leg);
            if (leg.timestamp < boundaryTs) reachedBoundary = true;
        }

        if (reachedBoundary) break;
        if (legs.length >= MAX_LEGS) {
            capped = true;
            break;
        }
        if (!response.hasMore || !response.nextCursor) break;
        cursor = response.nextCursor;
    }

    return { legs, capped };
}

// --- classification --------------------------------------------------------------------------

/** Earliest unix timestamp included for each window. `all` → 0 (everything fetched). */
function windowStart(window: FlowWindow): number {
    const now = Math.floor(Date.now() / 1000);
    switch (window) {
        case 'today': {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            return Math.floor(start.getTime() / 1000);
        }
        case '7d':
            return now - 7 * DAY_SECONDS;
        case '30d':
            return now - 30 * DAY_SECONDS;
        case 'all':
        default:
            return 0;
    }
}

/**
 * Classify a single leg into exactly one {@link FlowBucket} from the viewpoint of `me`.
 * `counterpartyKind` is the pre-resolved {@link AvatarKind} of the non-me side (or `null`
 * when unknown / not a registered avatar). Returns the bucket plus the counterparty.
 *
 * Rules (verified on-chain semantics):
 *   - from == 0x0                          → Minted (in)
 *   - to == 0x0                            → Demurrage (out)
 *   - counterparty is migration sink/treasury → Converted (neutral)
 *   - counterpartyKind == null             → Converted (neutral) — wrapper/lift/treasury/contract
 *   - counterparty is organization         → out: Spent, in: Received
 *   - counterparty is person/group         → out: Sent,  in: Received
 *   - anything else (defensive)            → Converted (neutral)
 */
function classifyLeg(
    leg: FlowLeg,
    me: string,
    counterpartyKind: AvatarKind,
    conversionAddrs: Set<string>
): { bucket: FlowBucket; counterparty: string } {
    const from = leg.from;
    const to = leg.to;
    const isIn = to === me;
    const counterparty = isIn ? from : to;

    if (from === ZERO_ADDRESS) {
        return { bucket: 'minted', counterparty };
    }
    if (to === ZERO_ADDRESS) {
        return { bucket: 'demurrage', counterparty };
    }
    if (conversionAddrs.has(counterparty)) {
        return { bucket: 'converted', counterparty };
    }
    if (counterpartyKind === null) {
        // Not a registered avatar — wrapper / lift / treasury / other contract.
        return { bucket: 'converted', counterparty };
    }
    if (counterpartyKind === 'organization') {
        return { bucket: isIn ? 'received' : 'spent', counterparty };
    }
    // person or group
    return { bucket: isIn ? 'received' : 'sent', counterparty };
}

/**
 * Build flow metrics for ALL windows from a single fetch + classification pass.
 *
 * Returns one {@link FlowMetrics} per window. Counterparty kinds are resolved once
 * (cached, deduplicated) for the union of all in-window legs, so switching windows in the
 * UI does no extra network work.
 */
export async function computeFlowMetrics(
    address: string
): Promise<Record<FlowWindow, FlowMetrics>> {
    const me = address.toLowerCase();
    const sdk = get(circles);

    const result: Record<FlowWindow, FlowMetrics> = {
        today: emptyFlowMetrics(),
        '7d': emptyFlowMetrics(),
        '30d': emptyFlowMetrics(),
        all: emptyFlowMetrics(),
    };

    if (!sdk) return result;

    const { legs, capped } = await fetchLegs(sdk, me);

    // Conversion addresses are value-neutral targets identified by address (not kind):
    // the legacy-group migration sink (from config) and the parent treasury (collateral).
    const conversionAddrs = new Set<string>([TREASURY]);
    const sink = getActiveConfig().scoreGroupMigrationSink;
    if (sink) conversionAddrs.add(sink.toLowerCase());

    // Resolve counterparty kinds once for every distinct non-me, non-zero, non-conversion
    // address that actually appears, so per-window classification is purely synchronous.
    const counterpartyByLeg = legs.map((leg) =>
        leg.to === me ? leg.from : leg.to
    );
    const toResolve = new Set<string>();
    for (const cp of counterpartyByLeg) {
        if (cp === ZERO_ADDRESS) continue;
        if (conversionAddrs.has(cp)) continue;
        toResolve.add(cp);
    }
    const kindByAddr = new Map<string, AvatarKind>();
    await Promise.all(
        Array.from(toResolve).map(async (addr) => {
            kindByAddr.set(addr, await avatarKind(addr));
        })
    );

    const windows: FlowWindow[] = ['today', '7d', '30d', 'all'];
    for (const window of windows) {
        const start = windowStart(window);
        const m = emptyFlowMetrics();
        m.capped = window === 'all' ? capped : false;

        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            if (leg.timestamp < start) continue;

            const cp = counterpartyByLeg[i];
            const kind = conversionAddrs.has(cp) ? null : (kindByAddr.get(cp) ?? null);
            const { bucket, counterparty } = classifyLeg(leg, me, kind, conversionAddrs);

            m[bucket] += leg.amount;
            m.txByBucket[bucket].push({
                hash: leg.hash,
                amount: leg.amount,
                counterparty,
                timestamp: leg.timestamp,
            });
        }

        // NET excludes the neutral Converted bucket by construction.
        m.net = m.minted + m.received - m.sent - m.spent - m.demurrage;
        // Round away float noise from bigint→number conversion.
        m.net = Math.round(m.net * 1e10) / 1e10;
        result[window] = m;
    }

    return result;
}
