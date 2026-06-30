<script lang="ts">
    import type { Address } from '@aboutcircles/sdk-types';
    import { circles } from '$lib/shared/state/circles';
    import { T } from '$lib/design-system/tokens.js';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import { getTimeAgo } from '$lib/shared/utils/shared';
    import {
        loadGroupAffiliateMembers,
        type GroupAffiliateMember,
    } from '$lib/areas/groups/utils/getGroupAffiliateMembers';

    interface Props {
        group: Address;
    }
    let { group }: Props = $props();

    let members: GroupAffiliateMember[] = $state([]);
    let confirmedCount: number = $state(0);
    let pendingCount: number = $state(0);
    let truncated: boolean = $state(false);
    let unavailable: boolean = $state(false);
    let loading: boolean = $state(false);
    let error: string | null = $state(null);

    // Generation counter: drop a stale response if the group/SDK changed before it resolved.
    let loadGeneration = 0;

    async function load(): Promise<void> {
        const sdk = $circles;
        if (!sdk || !group) {
            members = []; confirmedCount = 0; pendingCount = 0;
            truncated = false; unavailable = false; error = null;
            return;
        }
        const generation = ++loadGeneration;
        loading = true;
        error = null;
        try {
            const res = await loadGroupAffiliateMembers(sdk, group);
            if (generation !== loadGeneration) return;
            members = res.members;
            confirmedCount = res.confirmedCount;
            pendingCount = res.pendingCount;
            truncated = res.truncated;
            unavailable = res.unavailable;
        } catch (e) {
            if (generation !== loadGeneration) return;
            error = e instanceof Error ? e.message : String(e);
            members = [];
        } finally {
            if (generation === loadGeneration) loading = false;
        }
    }

    $effect(() => {
        // Re-run whenever the group or the SDK instance changes.
        void group;
        void $circles;
        void load();
    });
</script>

<!-- Hidden entirely when the server lacks the affiliate methods (e.g. production),
     so the members page stays clean unless the feature is actually available. -->
{#if !unavailable}
    <section style="background:#FFFFFF;border:1px solid rgba(31,17,70,0.05);border-radius:12px;padding:16px;width:100%;">
        <!-- Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
            <div style="display:flex;flex-direction:column;gap:3px;">
                <span style="font-size:14px;font-weight:600;color:{T.ink};">Community join requests</span>
                <span style="font-size:12px;color:{T.inkMuted};line-height:1.4;">
                    Avatars that signalled intent to join this group as a community. Confirmed once the group trusts them back.
                </span>
            </div>
            {#if !loading && !error && members.length > 0}
                <span style="flex:0 0 auto;font-size:11.5px;font-weight:560;color:{T.inkMuted};font-variant-numeric:tabular-nums;white-space:nowrap;">
                    {confirmedCount} confirmed · {pendingCount} pending
                </span>
            {/if}
        </div>

        {#if loading}
            <div style="display:flex;flex-direction:column;gap:8px;">
                {#each Array(3) as _, i (i)}
                    <div style="height:48px;border-radius:10px;background:{T.pageDeep};" class="animate-pulse"></div>
                {/each}
            </div>
        {:else if error}
            <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
                <span style="font-size:12.5px;color:{T.inkMuted};">Couldn't load community join requests. {error}</span>
                <button
                    type="button"
                    onclick={load}
                    style="height:30px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:12px;font-weight:540;cursor:pointer;"
                >Retry</button>
            </div>
        {:else if members.length === 0}
            <div style="font-size:13px;color:{T.inkMuted};padding:6px 0;">
                No one has signalled to join this community yet.
            </div>
        {:else}
            <div style="display:flex;flex-direction:column;gap:2px;">
                {#each members as m (m.avatarAddress)}
                    <div
                        role="button"
                        tabindex={0}
                        onclick={() => openProfilePopup(m.avatarAddress)}
                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfilePopup(m.avatarAddress); } }}
                        style="
                            display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:10px;cursor:pointer;
                            transition:background .14s ease-out;
                        "
                        class="member-row"
                    >
                        <div style="flex:1;min-width:0;">
                            <Avatar
                                address={m.avatarAddress}
                                view="small"
                                clickable={false}
                                showTypeInfo={false}
                                bottomInfo={getTimeAgo(m.timestamp)}
                            />
                        </div>
                        {#if m.confirmed}
                            <span style="flex:0 0 auto;display:inline-flex;align-items:center;padding:3px 9px;border-radius:9999px;background:{T.sageSoft};color:#1F5E37;font-size:10.5px;font-weight:580;letter-spacing:0.02em;">Confirmed</span>
                        {:else}
                            <span style="flex:0 0 auto;display:inline-flex;align-items:center;padding:3px 9px;border-radius:9999px;background:{T.butterSoft};color:#7A5B12;font-size:10.5px;font-weight:580;letter-spacing:0.02em;">Pending</span>
                        {/if}
                    </div>
                {/each}
            </div>
            {#if truncated}
                <div style="font-size:11.5px;color:{T.inkMuted};margin-top:10px;">
                    Showing the first {members.length} requests.
                </div>
            {/if}
        {/if}
    </section>
{/if}

<style>
    .member-row:hover {
        background: rgba(31, 17, 70, 0.03);
    }
</style>
