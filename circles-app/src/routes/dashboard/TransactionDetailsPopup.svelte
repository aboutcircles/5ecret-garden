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
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';

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
    const headerColor = $derived(() => {
        if (headerNetAmount() < 0) {
            return T.negative;
        }
        if (headerNetAmount() > 0) {
            return T.positive;
        }
        return T.ink;
    });
    const headerGradient = $derived(() => {
        if (headerNetAmount() < 0) {
            return `linear-gradient(160deg, ${T.coralSoft} 0%, ${T.surface} 100%)`;
        }
        if (headerNetAmount() > 0) {
            return `linear-gradient(160deg, ${T.sageSoft} 0%, ${T.surface} 100%)`;
        }
        return `linear-gradient(160deg, ${T.lilacSoft} 0%, ${T.surface} 100%)`;
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

<div style="display:flex;flex-direction:column;width:100%;gap:14px;">
    <!-- Hero amount card -->
    <div style="
        background:{headerGradient()};border:1px solid {T.hairlineSoft};border-radius:18px;overflow:hidden;
        box-shadow:{T.shadow.xs};
    ">
        <div style="padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <span style="font-family:{T.fontDisplay};font-size:48px;color:{headerColor()};letter-spacing:-0.02em;line-height:1;font-weight:400;">
                {signedAmount()}<span style="font-family:{T.fontSans};font-size:16px;color:{T.inkMuted};font-weight:540;margin-left:6px;">CRC</span>
            </span>
            {#if demurrageAbs() > 0}
                <span style="font-size:12px;color:{T.negative};font-weight:540;">
                    −{formatAmount(demurrageAbs())} CRC demurrage
                </span>
            {/if}
        </div>

        <div style="padding:14px 16px;border-top:1px solid {T.hairlineSoft};background:{T.surface};">
            {#if swapSummary()}
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <!-- Forward leg -->
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <div style="min-width:0;flex:1;"><Avatar address={item.from} view="horizontal" clickable={true} /></div>
                        <div style="display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};flex-shrink:0;">
                            {#if swapSummary()?.forwardTokenAddress}
                                <Avatar address={swapSummary().forwardTokenAddress} view="small_no_text" clickable={true} />
                            {/if}
                            <Icon name="arrowRight" size={14} stroke={T.inkMuted} />
                        </div>
                        <div style="min-width:0;flex:1;display:flex;justify-content:flex-end;"><Avatar address={item.to} view="horizontal" clickable={true} /></div>
                    </div>
                    <!-- Return leg -->
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <div style="min-width:0;flex:1;"><Avatar address={item.from} view="horizontal" clickable={true} /></div>
                        <div style="display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};flex-shrink:0;">
                            {#if swapSummary()?.backwardTokenAddress}
                                <Avatar address={swapSummary().backwardTokenAddress} view="small_no_text" clickable={true} />
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
                        {#if mainTokenAddress()}
                            <Avatar address={mainTokenAddress()} view="small_no_text" clickable={true} />
                        {/if}
                        <Icon name="arrowRight" size={14} stroke={T.inkMuted} />
                    </div>
                    <div style="min-width:0;flex:1;display:flex;justify-content:flex-end;"><Avatar address={item.to} view="horizontal" clickable={true} /></div>
                </div>
                <div style="margin-top:10px;padding-top:10px;border-top:1px solid {T.hairlineSoft};display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Direction</span>
                    <span style="font-size:12.5px;color:{T.inkBody};font-weight:540;">{sent ? 'You sent this' : 'You received this'}</span>
                </div>
            {/if}
        </div>
    </div>

    <!-- Details table -->
    <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Date &amp; time</span>
            <span style="font-size:12.5px;color:{T.ink};">{dateTime()}</span>
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

    {#if aggregatedTransfers().length}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
            <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};">
                <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                    Aggregated transfers <span style="color:{T.inkFaint};">({aggregatedTransfers().length})</span>
                </span>
            </div>
            {#each nonBurnTransfers() as t, ri (ri)}
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
                    <span style="flex-shrink:0;font-size:13px;font-weight:580;color:{T.ink};font-variant-numeric:tabular-nums;">
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
            {#if burnTransfers().length}
                <button
                    type="button"
                    style="width:100%;padding:10px 14px;border-top:1px solid {T.hairlineSoft};background:{T.surfaceAlt};border-left:0;border-right:0;border-bottom:0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;color:{T.inkMuted};"
                    onclick={toggleBurns}
                    aria-expanded={burnsOpen}
                    title={burnsOpen ? 'Hide burns' : 'Show burns'}
                >
                    <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                        Burns <span style="color:{T.inkFaint};">({burnTransfers().length})</span>
                    </span>
                    <span style="font-size:11.5px;color:{T.inkBody};font-variant-numeric:tabular-nums;">
                        {formatAmount(totalBurned())}<span style="color:{T.inkMuted};margin-left:3px;">CRC</span>
                    </span>
                </button>
                {#if burnsOpen}
                    {#each burnTransfers() as t (t.from + t.to + t.amount)}
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
                            <span style="flex-shrink:0;font-size:13px;font-weight:580;color:{T.ink};font-variant-numeric:tabular-nums;">
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

<style>
    /* No bespoke theme here; rely on Tailwind/DaisyUI to match the app. */
</style>
