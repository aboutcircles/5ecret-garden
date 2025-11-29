<script lang="ts">
    import type { TransactionHistoryRow } from '@circles-sdk/data';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import Tabs from '$lib/components/tabs/Tabs.svelte';
    import Tab from '$lib/components/tabs/Tab.svelte';
    // Lucide icons are node definitions (arrays). Use the local Lucide wrapper to render them.
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ArrowRight as LArrowRight, ExternalLink as LExternalLink, Copy as LCopy, Flame as LFlame, Coins as LCoins } from 'lucide';
    import { uint256ToAddress } from '@circles-sdk/utils';
    import { formatCurrency } from '$lib/cart/money';

    interface Props { item: TransactionHistoryRow }
    let { item }: Props = $props();

    // Selected tab id (Details | JSON)
    let selectedTab = $state<string | null>('details');

    // Robust timestamp handling: support seconds and milliseconds
    const dateTime = $derived(() => {
        const ts = Number(item.timestamp ?? 0);
        const ms = ts < 1e12 ? ts * 1000 : ts; // if it's in seconds, convert to ms
        return new Date(ms).toLocaleString();
    });

    // Whether the current viewer is the sender of this transaction.
    // Important: make this a boolean value, not a function, so template checks work correctly.
    const sent = $derived((() => {
        const me = avatarState.avatar?.address?.toLowerCase();
        return me ? item.from.toLowerCase() === me : false;
    })());

    function formatAmount(v: number): string {
        const abs = Math.abs(v);
        return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
    }

    const amountText = $derived(`${formatAmount(item.circles)} CRC`);
    const signedAmount = $derived(() => `${sent ? '-' : '+'}${formatAmount(item.circles)}`);

    // Robust JSON stringify that handles BigInt, Maps/Sets, and circular references
    function safeStringify(value: any, space: number = 2): string {
        const seen = new WeakSet();
        function replacer(_key: string, val: any) {
            if (typeof val === 'bigint') return val.toString();
            if (val instanceof Map) return Object.fromEntries(val);
            if (val instanceof Set) return Array.from(val);
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) return '[Circular]';
                seen.add(val);
            }
            return val;
        }
        try {
            return JSON.stringify(value, replacer, space);
        } catch (e) {
            console.error('Error serializing transaction data:', e);
            return '{}';
        }
    }

    // JSON stringify with formatting for display
    const formattedJson = $derived(() => safeStringify(item, 2));

    async function copyJsonToClipboard() {
        try {
            await navigator.clipboard.writeText(formattedJson());
            // Could add a toast notification here if needed
        } catch (error) {
            console.error('Failed to copy JSON:', error);
        }
    }

    function openOnExplorer() {
        const url = `https://gnosisscan.io/tx/${item.transactionHash}`;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function copyHash() {
        navigator.clipboard?.writeText(item.transactionHash).catch(() => {});
    }

    // Helper: detect EVM address strings
    const isAddress = (v: unknown): v is string => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const isZeroAddress = (addr?: string | null) => (addr ?? '').toLowerCase() === ZERO_ADDRESS;

    // Helper: detect ERC1155 token id-looking fields and convert to avatar address
    // According to project usage, the token id maps 1:1 to an avatar address.
    // Prefer a ready-made converter from the SDK instead of manual hex slicing.
    const tokenIdKeys = new Set(['Id', 'TokenId', 'TokenID']);
    function tokenIdToAddressMaybe(key: string, val: unknown): string | null {
        if (!tokenIdKeys.has(key)) return null;
        try {
            // Accept numbers, bigint, or decimal/hex strings
            let bi: bigint | null = null;
            if (typeof val === 'bigint') bi = val;
            else if (typeof val === 'number' && Number.isFinite(val)) bi = BigInt(val);
            else if (typeof val === 'string') {
                const s = val.trim();
                if (/^0x[0-9a-fA-F]+$/.test(s)) bi = BigInt(s);
                else if (/^\d+$/.test(s)) bi = BigInt(s);
            }
            if (bi === null) return null;
            const addr = uint256ToAddress(bi);
            return isAddress(addr) ? addr : null;
        } catch {
            return null;
        }
    }

    // Helper to safely pick an address for display inside the template without TS casts in markup
    function addressForDisplay(key: string, val: unknown): string {
        const addr = isAddress(val) ? val : tokenIdToAddressMaybe(key, val);
        return addr ?? '';
    }

    // Convert values that are expressed in attoCircles (1e18) to human circles string
    const ATTO = 10n ** 18n;
    function toBigIntMaybe(v: unknown): bigint | null {
        try {
            if (typeof v === 'bigint') return v;
            if (typeof v === 'number' && Number.isFinite(v)) return BigInt(Math.trunc(v));
            if (typeof v === 'string') {
                const s = v.trim();
                if (/^0x[0-9a-fA-F]+$/.test(s)) return BigInt(s);
                if (/^[+-]?\d+$/.test(s)) return BigInt(s);
            }
        } catch {}
        return null;
    }
    function formatAttoCircles(val: unknown): string | null {
        const bi = toBigIntMaybe(val);
        if (bi === null) return null;
        // preserve sign
        const sign = bi < 0n ? -1 : 1;
        const abs = bi < 0n ? -bi : bi;
        // Convert to a JS number in circles; for UI we only need 2 decimals
        const circles = Number(abs) / 1e18 * sign;
        if (!Number.isFinite(circles)) return null;
        return formatCurrency(circles, 'CRC');
    }

    // Parse events which may come as a JSON-encoded string or as an array already
    type TxEvent = Record<string, any> & { $type?: string };
    const events = $derived<TxEvent[]>(() => {
        const raw = (item as any)?.events;
        if (!raw) return [];
        try {
            if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
            return Array.isArray(raw) ? raw : [];
        } catch (e) {
            console.warn('Failed to parse events from transaction item', e);
            return [];
        }
    });

    // --- Aggregated transfers (CrcV2_Transfer*) ---
    // Build a compact summary of all net flows between accounts found inside nested events.
    type AggregatedTransfer = { from: string; to: string; amount: number };

    // Helper: try to read an EVM address from an arbitrary field value
    const asAddressMaybe = (val: unknown): string | null => (isAddress(val) ? String(val) : null);

    // Convert unknown value(s) representing attoCircles to a numeric amount in Circles (CRC)
    function toCirclesNumber(val: unknown): number | null {
        // Prefer bigint/hex/integer parsing
        const bi = toBigIntMaybe(val);
        if (bi !== null) {
            const sign = bi < 0n ? -1 : 1;
            const abs = bi < 0n ? -bi : bi;
            const num = Number(abs) / 1e18;
            if (!Number.isFinite(num)) return null;
            return num * sign;
        }
        // Fallback: already provided as a number in CRC
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        return null;
    }

    // Extract simple transfers from supported Transfer* events
    function extractTransfers(ev: TxEvent): { from: string; to: string; amount: number }[] {
        const type = String(ev.$type ?? '');
        // Support standard TransferSingle/TransferBatch and ERC20 wrapper transfers
        const isTransferLike = /^CrcV2_Transfer/.test(type) || type === 'CrcV2_Erc20WrapperTransfer';
        if (!isTransferLike) return [];

        const from = asAddressMaybe(ev.From);
        const to = asAddressMaybe(ev.To);
        if (!from || !to) return [];

        // Single transfer
        if ('Value' in ev) {
            const amount = toCirclesNumber((ev as any).Value);
            if (amount === null) return [];
            return [{ from, to, amount }];
        }

        // Batch transfer: Values[]
        if (Array.isArray((ev as any).Values)) {
            const vals: unknown[] = (ev as any).Values;
            const sum = vals.reduce((acc, v) => {
                const n = toCirclesNumber(v);
                return acc + (n ?? 0);
            }, 0);
            if (sum === 0) return [];
            return [{ from, to, amount: sum }];
        }

        return [];
    }

    const aggregatedTransfers = $derived<AggregatedTransfer[]>(() => {
        const map = new Map<string, { a: string; b: string; net: number }>();
        for (const ev of events()) {
            const transfers = extractTransfers(ev);
            for (const t of transfers) {
                if (t.from.toLowerCase() === t.to.toLowerCase()) continue; // ignore self-transfers
                const a = t.from.toLowerCase();
                const b = t.to.toLowerCase();
                // canonical unordered key
                const [min, max] = a < b ? [a, b] : [b, a];
                const key = `${min}|${max}`;
                const rec = map.get(key) ?? { a: min, b: max, net: 0 };
                // positive when flowing from a->b in canonical order
                const delta = (t.from.toLowerCase() === rec.a) ? t.amount : -t.amount;
                rec.net += delta;
                map.set(key, rec);
            }
        }
        const result: AggregatedTransfer[] = [];
        for (const { a, b, net } of map.values()) {
            const amt = Math.abs(net);
            if (amt <= 0) continue;
            const from = net >= 0 ? a : b;
            const to = net >= 0 ? b : a;
            result.push({ from, to, amount: amt });
        }
        // Sort by largest absolute amount first
        result.sort((x, y) => y.amount - x.amount);
        return result;
    });

    // Split aggregated transfers into non-burns and burns (to zero address)
    const nonBurnTransfers = $derived(() => aggregatedTransfers().filter(t => !isZeroAddress(t.to)));
    const burnTransfers = $derived(() => aggregatedTransfers().filter(t => isZeroAddress(t.to)));

    // Burns group collapsed by default
    let burnsOpen = $state(false);
    function toggleBurns() { burnsOpen = !burnsOpen; }

    // Total amount burned (sum of burn transfers)
    const totalBurned = $derived(() => burnTransfers().reduce((acc, t) => acc + (t?.amount ?? 0), 0));

    // Collapsible state for single nested events – collapsed by default
    let openEvents = $state<Set<number>>(new Set());
    function isOpen(i: number) { return openEvents.has(i); }
    function toggleOpen(i: number) {
        const next = new Set(openEvents);
        if (next.has(i)) next.delete(i); else next.add(i);
        openEvents = next;
    }

    // Top-level Events list collapsed by default
    let eventsListOpen = $state(false);
    function toggleEventsList() { eventsListOpen = !eventsListOpen; }

    // Nice label for known event keys
    const niceKey = (k: string) => {
        if (k === '$type') return 'Type';
        // Convert PascalCase to spaced words, keep IDs all caps segments
        return k
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/^Id$/i, 'ID');
    };

    // Choose which keys to show and in what order for each event
    const primaryOrder = ['$', '$type', 'Emitter', 'Operator', 'From', 'To', 'Account', 'Sender', 'Receiver', 'Group', 'Id', 'Value', 'Cost', 'Amount', 'BatchIndex', 'LogIndex'];
    const hiddenKeys = new Set(['BlockNumber', 'Timestamp', 'TransactionIndex', 'TransactionHash']);
    const eventDisplayEntries = (ev: TxEvent): [string, any][] => {
        const entries: [string, any][] = Object.entries(ev).filter(([k]) => !hiddenKeys.has(k));
        // sort by our preferred order, otherwise alphabetical
        const orderIndex = (k: string) => {
            const idx = primaryOrder.indexOf(k);
            // special case for $ so it comes first if present
            return idx === -1 ? 999 : idx;
        };
        entries.sort(([a], [b]) => {
            const ai = orderIndex(a);
            const bi = orderIndex(b);
            if (ai !== bi) return ai - bi;
            return a.localeCompare(b);
        });
        return entries;
    };
</script>

<div class="flex flex-col w-full">
    <Tabs id="tx-details-tabs" defaultValue="details" bind:selected={selectedTab} variant="bordered" size="sm">
        <Tab id="details" title="Details" panelClass="pt-4">
            <!-- Combined Amount + From→To box to avoid double borders -->
            <div class="bg-base-100 border rounded-xl overflow-hidden">
                <!-- Amount section -->
                <div class="p-4 flex items-center justify-center">
                    <div class="text-center">
                        <div class={`text-3xl sm:text-4xl font-extrabold ${sent ? 'text-error' : 'text-success'}`}>
                            {signedAmount()} <span class="opacity-70 text-base align-middle">CRC</span>
                        </div>
                    </div>
                </div>
                <div class="border-t"></div>
                <!-- From → To section -->
                <div class="p-3">
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2 min-w-0">
                            <Avatar address={item.from} view="horizontal" clickable={true} />
                        </div>
                        <div class="shrink-0 text-base-content/70">
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
                </div>
            </div>

            <!-- Table-like detail view -->
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
                            <button class="btn btn-xs btn-ghost" onclick={copyHash} title="Copy hash"><Lucide icon={LCopy} size={14} /> Copy</button>
                            <button class="btn btn-xs btn-primary" onclick={openOnExplorer} title="Open on Gnosisscan"><Lucide icon={LExternalLink} size={14} /> Open</button>
                        </div>
                    </div>
                </div>
            </div>
            {#if aggregatedTransfers().length}
                <div class="bg-base-100 border mt-4 rounded-xl overflow-hidden">
                    <div class="p-3 border-b">
                        <div class="text-sm opacity-70">Aggregated transfers <span class="opacity-60">({aggregatedTransfers().length})</span></div>
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
                                        <!-- Mobile: icon only -->
                                        <div class="sm:hidden">
                                            <Avatar address={t.from} view="small_no_text" clickable={true} />
                                        </div>
                                        <!-- ≥sm: name inline -->
                                        <div class="hidden sm:inline-flex">
                                            <Avatar address={t.from} view="small" clickable={true} />
                                        </div>
                                    {/if}
                                </div>
                                <div class="shrink-0 text-sm sm:text-base font-semibold tabular-nums">
                                    {formatAmount(t.amount)} <span class="opacity-70">CRC</span>
                                </div>
                                <div class="shrink-0 text-base-content/70">
                                    <div class="w-6 h-6 rounded-full bg-base-200/70 flex items-center justify-center">
                                        <Lucide icon={LArrowRight} size={16} />
                                    </div>
                                </div>
                                <div class="flex-1 min-w-0 flex items-center gap-2 justify-end">
                                    <!-- Mobile: icon only -->
                                    <div class="sm:hidden">
                                        <Avatar address={t.to} view="small_no_text" clickable={true} />
                                    </div>
                                    <!-- ≥sm: name inline but reversed (text left, image right) -->
                                    <div class="hidden sm:inline-flex">
                                        <Avatar address={t.to} view="small_reverse" clickable={true} />
                                    </div>
                                </div>
                            </div>
                        {/each}
                        {#if burnTransfers().length}
                            <!-- Burns sub-header inside the same box; collapsible, collapsed by default -->
                            <button class="w-full p-3 bg-base-200/50 text-xs uppercase tracking-wide text-base-content/60 flex items-center justify-between hover:bg-base-200/70 transition-colors"
                                onclick={toggleBurns}
                                aria-expanded={burnsOpen}
                                title={burnsOpen ? 'Hide burns' : 'Show burns'}>
                                <span>Burns <span class="opacity-60">({burnTransfers().length})</span></span>
                                <span class="text-[11px] normal-case opacity-80">{formatAmount(totalBurned())} <span class="opacity-70">CRC</span></span>
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
                                            <!-- Mobile: icon only -->
                                            <div class="sm:hidden">
                                                <Avatar address={t.from} view="small_no_text" clickable={true} />
                                            </div>
                                            <!-- ≥sm: name inline -->
                                            <div class="hidden sm:inline-flex">
                                                <Avatar address={t.from} view="small" clickable={true} />
                                            </div>
                                        {/if}
                                    </div>
                                    <div class="shrink-0 text-sm sm:text-base font-semibold tabular-nums">
                                        {formatAmount(t.amount)} <span class="opacity-70">CRC</span>
                                    </div>
                                    <div class="shrink-0 text-base-content/70">
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

            {#if events().length}
                <div class="bg-base-100 border mt-4 rounded-xl overflow-hidden">
                    <div
                            class="flex items-center justify-between p-3 border-b cursor-pointer select-none"
                            role="button"
                            tabindex="0"
                            aria-expanded={eventsListOpen}
                            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEventsList(); } }}
                            onclick={toggleEventsList}
                    >
                        <div class="text-sm opacity-70">Events <span class="opacity-60">({events().length})</span></div>
                        <div class="transition-transform duration-200 text-base-content/70 {eventsListOpen ? 'rotate-90' : ''}">
                            <Lucide icon={LArrowRight} size={14} />
                        </div>
                    </div>
                    {#if eventsListOpen}
                        <div class="divide-y">
                            {#each events() as ev, i}
                                <div class="p-3">
                                    <div
                                            class="flex items-center justify-between mb-1 cursor-pointer select-none"
                                            role="button"
                                            tabindex="0"
                                            aria-expanded={isOpen(i)}
                                            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(i); } }}
                                            onclick={() => toggleOpen(i)}
                                    >
                                        <div class="flex items-center gap-2 min-w-0">
                                            <div class="transition-transform duration-200 text-base-content/70 {isOpen(i) ? 'rotate-90' : ''}">
                                                <Lucide icon={LArrowRight} size={14} />
                                            </div>
                                            <div class="text-sm font-medium truncate">
                                                {ev.$type ?? 'Event'} <span class="opacity-60">#{i + 1}</span>
                                            </div>
                                        </div>
                                        <div class="text-xs opacity-60 shrink-0">Log {ev.LogIndex ?? '-'}</div>
                                    </div>
                                    {#if isOpen(i)}
                                        <div class="mt-2 overflow-x-auto">
                                            <table class="table table-xs text-xs">
                                                <thead>
                                                <tr>
                                                    <th class="w-40 whitespace-nowrap opacity-70">Field</th>
                                                    <th>Value</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {#each eventDisplayEntries(ev) as [k, v]}
                                                    <tr>
                                                        <td class="whitespace-nowrap opacity-70">{niceKey(k)}</td>
                                                        <td class="align-middle">
                                                            {#if k === 'Value' && formatAttoCircles(v)}
                                                                <span>{formatAttoCircles(v)}</span>
                                                            {:else if isAddress(v) || tokenIdToAddressMaybe(k, v)}
                                                                <div class="inline-flex items-center gap-2">
                                                                    <Avatar address={addressForDisplay(k, v)} view="small" clickable={true} />
                                                                </div>
                                                            {:else}
                                                                <span class="font-mono break-all">{typeof v === 'object' ? safeStringify(v, 0) : String(v)}</span>
                                                            {/if}
                                                        </td>
                                                    </tr>
                                                {/each}
                                                </tbody>
                                            </table>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </Tab>
        <Tab id="json" title="JSON" panelClass="pt-4">
            <!-- Raw JSON Display Section -->
            <div class="bg-base-100 border rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-base font-semibold">Transaction Data (JSON)</h3>
                    <button
                            class="btn btn-xs btn-ghost"
                            onclick={copyJsonToClipboard}
                            title="Copy JSON to clipboard"
                    >
                        <Lucide icon={LCopy} size={14} /> Copy JSON
                    </button>
                </div>

                <!-- JSON display -->
                <pre class="bg-base-200 p-4 rounded-lg overflow-auto max-h-96 text-xs leading-relaxed font-mono">{formattedJson()}</pre>
            </div>
        </Tab>
    </Tabs>
</div>

<style>
    /* No bespoke theme here; rely on Tailwind/DaisyUI to match the app. */
</style>
