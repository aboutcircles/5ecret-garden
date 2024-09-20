<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {runTask} from "../../routes/+layout.svelte";
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";

    export let address: string;
    export let contentApi: PopupContentApi;

    async function untrust() {
        if (!$avatar) {
            throw new Error("Avatar store not available");
        }
        runTask({
            name: `Untrusting ${address} ...`,
            promise: $avatar!.untrust(address)
        });
        contentApi.close();
    }
</script>

<div class="p-6 pt-0">
    <p class="mb-4">
        You're about to un-trust the following group or person:
    </p>
    <Avatar address={address}>
        {address}
    </Avatar>
    <div role="alert" class="mt-4 alert alert-warning">
        <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24">
            <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>Un-trusting means that you no longer accept their tokens.</span>
    </div>

    <div class="modal-action">
        <button type="submit" class="btn btn-primary" on:click={async () => await untrust()}>Un-trust</button>
    </div>
</div>
