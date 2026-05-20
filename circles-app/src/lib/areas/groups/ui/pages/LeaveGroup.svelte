<script lang="ts">
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import { executeTxConfirmFirst } from '$lib/shared/utils/txExecution';
    import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';
    import { popupControls } from '$lib/shared/state/popup';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { shortenAddress } from '$lib/shared/utils/shared';

    interface Props {
        group: `0x${string}`;
        // Fires only after the opt-out tx receipt is back. The parent typically
        // removes the group from the visible list here (confirmed-then-update UX).
        onLeft?: () => void | Promise<void>;
    }

    let { group, onLeft }: Props = $props();

    // ScoreGroup.optOut() — no args. Selector: keccak256("optOut()")[0:4]
    const OPT_OUT_CALLDATA = '0xd4eec5a6';

    async function leaveGroup() {
        const runner: any = $wallet;
        if (!runner) throw new Error('Wallet is not connected.');

        await executeTxConfirmFirst({
            name: `Leaving group ${shortenAddress(group)} ...`,
            submit: () => sendRunnerTransactionAndWait(runner, {
                to: group,
                value: 0n,
                data: OPT_OUT_CALLDATA,
            }, { label: 'Leave group' }),
            onSuccess: async () => {
                popupControls.close();
                await onLeft?.();
            },
        });
    }
</script>

<div class="space-y-4 p-1">
    <p class="text-sm">
        You're about to opt out of the following group:
    </p>

    <Avatar
        address={group}
        view="horizontal"
        clickable={false}
        bottomInfo={group}
        showTypeInfo={true}
    />

    <div class="rounded-md bg-warning/10 text-warning-content border border-warning/30 p-3 text-sm">
        Opting out revokes the group's trust of your avatar and prevents it from re-adding you
        until you call <code>trust</code> on yourself again.
    </div>

    <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-ghost btn-sm" onclick={() => popupControls.close()}>
            Cancel
        </button>
        <button type="button" class="btn btn-error btn-sm" onclick={leaveGroup} disabled={!$wallet}>
            Opt out
        </button>
    </div>
</div>
