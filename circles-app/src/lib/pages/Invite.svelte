<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import { runTask } from '$lib/utils/tasks';
    import {shortenAddress} from "$lib/utils/shared";
  import { popupControls } from "$lib/stores/popUp";

    export let address: string;

    async function invite() {
        if (!$avatar) {
            throw new Error("Avatar store not available");
        }
        runTask({
            name: `Inviting ${shortenAddress(address)} ...`,
            promise: $avatar!.inviteHuman(address)
        });
        popupControls.close();
    }
</script>

<div class="p-6 pt-0 mt-6">
    <p class="mb-4">
        You're about to invite the following address to Circles:
    </p>

    <div class="inline-flex items-center space-x-2 border-2 p-6 rounded-2xl w-full">
        <div>
            <span>{shortenAddress(address)}</span>
            <p class="text-xs text-gray-500">
                <a href="https://gnosisscan.io/address/{address}" target="_blank" rel="noopener noreferrer"
                   class="text-blue-500">View on Gnosisscan</a>
            </p>
        </div>
    </div>

    <p class="mb-4 mt-4">
        The person will appear in your contacts once they accept the invitation.
    </p>

    <div class="modal-action">
        <button type="submit" class="btn btn-primary" on:click={async () => await invite()}>Invite</button>
    </div>
</div>
