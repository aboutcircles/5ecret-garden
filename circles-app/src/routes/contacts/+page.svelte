<script lang="ts">
    import { browser } from '$app/environment';
    import { contacts } from '$lib/shared/state/contacts';
    import Papa from 'papaparse';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import ContactRow from './ContactRow.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import { derived, writable, type Writable } from 'svelte/store';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
    import { goto } from '$app/navigation';
    import { createPaginatedList } from '$lib/shared/state/paginatedList';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import { getProfilesCoreBatch } from '$lib/shared/model/profile/coreRepo';

    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';

    const CONTACTS_PAGE_SIZE = 25;
    const CONTACTS_VISIBLE_COUNT_KEY = 'contacts:list:visible-count';

    function getInitialPageCount(): number {
        if (!browser) return 1;
        const raw = Number(window.sessionStorage.getItem(CONTACTS_VISIBLE_COUNT_KEY) ?? '0');
        if (!Number.isFinite(raw) || raw <= 0) return 1;
        return Math.max(1, Math.ceil(raw / CONTACTS_PAGE_SIZE));
    }

    let activeRelation: Writable<'all' | 'mutuallyTrusts' | 'trustedBy' | 'trusts'> = writable('all');
    let searchQuery = writable<string>('');
    let contactsListScopeEl: HTMLDivElement | null = $state(null);

    const profileCoreCache = writable(new Map<string, any>());
    const inflightProfileRequests = new Set<string>();

    async function preloadProfileCores(addresses: string[]) {
        if (addresses.length === 0) return;
        const normalized = addresses.map((addr) => addr.toLowerCase());
        const cacheSnapshot = $profileCoreCache;
        const missing = normalized.filter((addr) => !cacheSnapshot.has(addr) && !inflightProfileRequests.has(addr));
        if (missing.length === 0) return;

        missing.forEach((addr) => inflightProfileRequests.add(addr));
        try {
            const map = await getProfilesCoreBatch(missing as any);
            profileCoreCache.update((prev) => {
                const next = new Map(prev);
                for (const [addr, profile] of map.entries()) {
                    next.set(addr.toLowerCase(), profile);
                }
                return next;
            });
        } catch (e) {
            console.debug('[contacts] failed to preload profiles', e);
        } finally {
            missing.forEach((addr) => inflightProfileRequests.delete(addr));
        }
    }

    const filteredAll = derived(
        [contacts, activeRelation, profileCoreCache],
        ([$contacts, $activeRelation, $profileCache]) => {
            return Object.entries($contacts.data)
                .filter(([_, contact]) => {
                    if (avatarState.isGroup) return contact.row.relation === 'trusts';
                    if ($activeRelation === 'all') return true;
                    return contact?.row?.relation === $activeRelation;
                })
                .sort((a, b) => {
                    const aRel = a[1].row.relation;
                    const bRel = b[1].row.relation;
                    if (aRel === 'mutuallyTrusts' && bRel !== 'mutuallyTrusts') return -1;
                    if (aRel === 'trusts' && bRel === 'trustedBy') return -1;
                    if (bRel === 'mutuallyTrusts' && aRel !== 'mutuallyTrusts') return 1;
                    if (bRel === 'trusts' && aRel === 'trustedBy') return 1;
                    return 0;
                })
                .map(([address, contact]) => ({
                    blockNumber: Date.now(),
                    transactionIndex: 0,
                    logIndex: 0,
                    address,
                    contact: {
                        ...contact,
                        contactProfile: contact?.contactProfile ?? $profileCache.get(address.toLowerCase()),
                    },
                }));
        }
    );

    const searchedAll = derived([filteredAll, searchQuery], ([$filteredAll, $searchQuery]) => {
        const q = ($searchQuery ?? '').toLowerCase();
        if (!q) return $filteredAll;
        return $filteredAll.filter((item) => {
            const name = item.contact?.contactProfile?.name?.toLowerCase?.() ?? '';
            return item.address.toLowerCase().includes(q) || name.includes(q);
        });
    });

    const contactsPaginated = createPaginatedList(searchedAll, {
        pageSize: CONTACTS_PAGE_SIZE,
        initialPageCount: getInitialPageCount(),
    });
    const contactsPaginatedWithEnd = derived([contactsPaginated, contacts], ([$paginated, $contacts]) => {
        const hasData = ($paginated?.data ?? []).length > 0;
        return { ...$paginated, ended: hasData ? $paginated.ended : ($contacts?.ended ?? false) };
    });

    $effect(() => {
        if (!browser) return;
        const loadedCount = $contactsPaginatedWithEnd?.data?.length ?? 0;
        if (loadedCount > 0) window.sessionStorage.setItem(CONTACTS_VISIBLE_COUNT_KEY, String(loadedCount));
    });

    $effect(() => {
        const addresses = $searchedAll.slice(0, 100).map((item) => item.address);
        void preloadProfileCores(addresses);
    });

    const onSearchInputKeydown = createListInputArrowDownHandler({
        getScope: () => contactsListScopeEl,
        rowSelector: '[data-contact-row]'
    });

    async function handleExportCSV(): Promise<void> {
        const csvData = $filteredAll.map((item) => ({
            address: item.address,
            name: item.contact?.contactProfile?.name,
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `contacts-${$activeRelation || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openAddContact() {
        if (!avatarState.avatar) return;
        openAddTrustFlow({
            context: {
                actorType: avatarState.isGroup ? 'group' : 'avatar',
                actorAddress: avatarState.avatar.address,
                selectedTrustees: [],
            },
        });
    }

    const trustCounts = derived(contacts, ($c) => {
        const entries = Object.values($c?.data ?? {}) as any[];
        return {
            total: entries.length,
            mutual: entries.filter(e => e.row?.relation === 'mutuallyTrusts').length,
            trustedBy: entries.filter(e => e.row?.relation === 'trustedBy').length,
            trusts: entries.filter(e => e.row?.relation === 'trusts').length,
        };
    });

    const titleText: string = $derived(avatarState.isGroup ? 'Members' : 'People');
    const countLabel: string = $derived(avatarState.isGroup ? 'members' : 'in your network');

    const chips = $derived([
        { key: 'all',            label: 'All',         count: $trustCounts.total,     bg: T.pageDeep,    color: T.inkBody,     dot: T.inkMuted },
        { key: 'mutuallyTrusts', label: 'Mutual',      count: $trustCounts.mutual,    bg: T.sageSoft,    color: '#1F5E37',     dot: T.sage },
        { key: 'trustedBy',      label: 'Trusts you',  count: $trustCounts.trustedBy, bg: T.primarySoft, color: T.primaryDeep, dot: T.primary },
        { key: 'trusts',         label: 'You trust',   count: $trustCounts.trusts,    bg: T.coralSoft,   color: '#8A3A1E',     dot: T.coral },
    ]);
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
    <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

        <!-- Page title -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 14px;">
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">{titleText}</span>
                <span style="font-size:12.5px;color:{T.inkMuted};">{$trustCounts.total} {countLabel}</span>
            </div>
            <button
                onclick={openAddContact}
                style="
                    height:40px;padding:0 14px;border-radius:9999px;
                    background:{T.primary};color:#fff;border:0;cursor:pointer;
                    display:inline-flex;align-items:center;gap:6px;
                    font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                    box-shadow:0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12);
                "
            >
                <Icon name="plus" size={15} stroke="#fff" strokeWidth={2.0} />
                {avatarState.isGroup ? 'Add member' : 'Trust someone'}
            </button>
        </div>

        <!-- Search -->
        <div style="
            height:42px;padding:0 14px;border-radius:9999px;
            background:{T.surface};border:1px solid {T.hairline};
            display:flex;align-items:center;gap:10px;margin-top:6px;
        ">
            <Icon name="search" size={16} stroke={T.inkMuted} />
            <input
                bind:value={$searchQuery}
                placeholder="Search people, addresses, ENS…"
                data-contacts-search-input
                onkeydown={onSearchInputKeydown}
                style="
                    border:0;outline:none;background:transparent;flex:1;
                    font-family:{T.fontSans};font-size:13.5px;color:{T.ink};
                "
            />
            {#if !avatarState.isGroup}
                <button
                    onclick={handleExportCSV}
                    aria-label="Export as CSV"
                    title="Export CSV"
                    style="background:transparent;border:0;padding:0;cursor:pointer;display:inline-flex;align-items:center;color:{T.inkMuted};"
                >
                    <Icon name="download" size={15} stroke={T.inkMuted} />
                </button>
            {/if}
        </div>

        <!-- Trust chips -->
        {#if !avatarState.isGroup}
            <div style="display:flex;align-items:center;gap:8px;margin-top:14px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
                {#each chips as c}
                    {@const isActive = $activeRelation === c.key}
                    <button
                        type="button"
                        onclick={() => activeRelation.set(c.key as any)}
                        style="
                            flex:0 0 auto;padding:10px 14px;border-radius:14px;cursor:pointer;
                            background:{c.bg};
                            border:{isActive ? `1.5px solid ${c.dot}` : '1.5px solid transparent'};
                            min-width:108px;text-align:left;
                            transition:transform .08s, box-shadow .15s;
                        "
                    >
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="width:6px;height:6px;border-radius:3px;background:{c.dot};display:inline-block;"></span>
                            <span style="font-size:11px;font-weight:580;color:{c.color};">{c.label}</span>
                        </div>
                        <div style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};margin-top:2px;line-height:1;letter-spacing:-0.015em;font-weight:400;">{c.count}</div>
                    </button>
                {/each}
            </div>
        {/if}

        <!-- Section heading -->
        <span style="display:block;font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-top:18px;margin-bottom:8px;padding-left:4px;">
            {avatarState.isGroup ? 'All members' : 'All people'}
        </span>

        <!-- People list -->
        {#if $filteredAll.length === 0 && ($contacts?.ended ?? false)}
            <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:32px 16px;text-align:center;">
                <span style="font-size:13.5px;color:{T.inkMuted};">{avatarState.isGroup ? 'No members yet' : 'No contacts yet'}</span>
            </div>
        {:else if $filteredAll.length > 0 && $searchedAll.length === 0}
            <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:32px 16px;text-align:center;">
                <span style="font-size:13.5px;color:{T.inkMuted};">No matches</span>
            </div>
        {:else}
            <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};overflow:hidden;box-shadow:{T.shadow.xs};">
                <div data-contacts-list-scope bind:this={contactsListScopeEl}>
                    <GenericList
                        store={contactsPaginatedWithEnd}
                        row={ContactRow}
                        rowHeight={64}
                        maxPlaceholderPages={2}
                        expectedPageSize={25}
                        placeholderRow={AvatarRowPlaceholder}
                    />
                </div>
            </div>
        {/if}

        <div style="height:24px;"></div>
    </div>
</div>
