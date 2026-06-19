<script lang="ts">
    import { goto } from '$app/navigation';
    import { contacts, initContactStore } from '$lib/shared/state/contacts';
    import { avatarState } from '$lib/shared/state/avatar.svelte';

    import { T } from '$lib/design-system/tokens.js';

    // The contacts store is normally initialised app-wide on wallet restore
    // (initAvatarStores in +layout.svelte). Call it here too, defensively, so a
    // cold dashboard mount still populates trust data. initContactStore is
    // dedup-guarded per avatar, so this is a no-op when already initialised.
    $effect(() => {
        if (avatarState.avatar) {
            initContactStore(avatarState.avatar);
        }
    });

    // Counting semantics REPLICATE contacts/+page.svelte's `trustCounts` exactly so
    // the dashboard numbers always equal the contacts page numbers:
    //   relation === 'trustedBy'      -> trusts you
    //   relation === 'trusts'         -> you trust
    //   relation === 'mutuallyTrusts' -> mutual
    // `row` is built as an AggregatedTrustRelation in the contacts query store, which
    // carries a Unix-seconds `timestamp` — so "new in 7d" is cheaply available here
    // without any extra fetch. The declared union (TrustRelationRow | AggregatedTrustRelation)
    // doesn't statically guarantee `timestamp`, so we guard against missing/zero values.
    const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

    let counts = $derived.by(() => {
        const entries = Object.values($contacts?.data ?? {});
        const nowSeconds = Math.floor(Date.now() / 1000);
        const cutoff = nowSeconds - SEVEN_DAYS_SECONDS;
        let trustedBy = 0;
        let trusts = 0;
        let mutual = 0;
        let recent = 0;
        for (const e of entries) {
            const relation = e?.row?.relation;
            if (relation === 'trustedBy') trustedBy++;
            else if (relation === 'trusts') trusts++;
            else if (relation === 'mutuallyTrusts') mutual++;
            // `timestamp` is Unix seconds, present on AggregatedTrustRelation but not on the
            // bare TrustRelationRow in the union — read it defensively, never assume it exists.
            const ts = Number((e?.row as { timestamp?: number } | undefined)?.timestamp);
            if (Number.isFinite(ts) && ts > 0 && ts >= cutoff) recent++;
        }
        return { total: entries.length, trustedBy, trusts, mutual, recent };
    });

    // Use the store's load-completion signals (NOT `ended`, which is pagination-exhaustion
    // and never flips on the personal path's single-page load — that gave a 0-trust user a
    // skeleton forever). `initialLoaded` flips once the first page resolves; on failure
    // `initialLoadError` lets us show an error instead of disguising it as "no connections".
    let errored = $derived($contacts?.initialLoadError ?? false);
    let loading = $derived(!errored && !($contacts?.initialLoaded ?? false));
    let isEmpty = $derived(!errored && ($contacts?.initialLoaded ?? false) && counts.total === 0);

    const metrics = $derived([
        { label: 'Trusts you', value: counts.trustedBy, dot: T.primary },
        { label: 'You trust',  value: counts.trusts,    dot: T.coral },
        { label: 'Mutual',     value: counts.mutual,    dot: T.sage },
    ]);
</script>

<button
    onclick={() => goto('/contacts')}
    aria-label="View your trust network"
    style="
        width:100%;margin-top:14px;padding:14px 16px;border-radius:18px;
        background:{T.surface};border:1px solid {T.hairlineSoft};
        box-shadow:{T.shadow.xs};cursor:pointer;text-align:left;display:block;
        font-family:{T.fontSans};
    "
>
    <!-- Header row -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Trust</span>
        {#if !loading && !isEmpty && counts.recent > 0}
            <span style="
                font-size:10.5px;font-weight:580;color:{T.primaryDeep};
                background:{T.primarySoft};border-radius:9999px;padding:2px 8px;
                white-space:nowrap;
            ">+{counts.recent} this week</span>
        {/if}
    </div>

    {#if loading}
        <!-- Skeleton -->
        <div style="display:flex;align-items:center;gap:18px;margin-top:12px;">
            {#each [0, 1, 2] as _}
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <span class="trust-skel" style="display:inline-block;width:28px;height:22px;background:rgba(15,10,30,0.07);border-radius:7px;"></span>
                    <span class="trust-skel" style="display:inline-block;width:54px;height:11px;background:rgba(15,10,30,0.05);border-radius:5px;"></span>
                </div>
            {/each}
        </div>
    {:else if errored}
        <!-- Initial load failed — surface it rather than showing a misleading "0". -->
        <div style="margin-top:8px;font-size:13px;color:{T.inkMuted};">Couldn’t load trust info</div>
    {:else if isEmpty}
        <!-- Empty state -->
        <div style="margin-top:8px;font-size:13px;color:{T.inkMuted};">No trust connections yet</div>
    {:else}
        <!-- Counts — each metric on ONE row (dot · number · label) so the card stays
             compact and visually matches the balance legend's inline style. -->
        <div style="display:flex;align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap;">
            {#each metrics as m}
                <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                    <span style="width:6px;height:6px;border-radius:3px;background:{m.dot};display:inline-block;flex-shrink:0;"></span>
                    <span style="font-family:{T.fontDisplay};font-size:18px;color:{T.ink};line-height:1;letter-spacing:-0.015em;font-weight:400;">{m.value}</span>
                    <span style="font-size:12px;color:{T.inkMuted};white-space:nowrap;">{m.label}</span>
                </div>
            {/each}
        </div>
    {/if}
</button>

<style>
    @keyframes trust-skel-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    :global(.trust-skel) {
        animation: trust-skel-pulse 1.6s ease-in-out infinite;
    }
</style>
