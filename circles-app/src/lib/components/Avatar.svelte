<script lang="ts">
    import {circles} from "$lib/stores/circles";

    export let address: string;
</script>

{#await $circles?.getAvatar(address)}
    <p>...</p>
{:then avatar}
    {#await avatar?.getProfile()}
        <p>...</p>
    {:then profile}
        {profile?.name ?? address}
    {:catch error}
        error loading profile
    {/await}
{:catch e}
    error loading avatar {address}
{/await}