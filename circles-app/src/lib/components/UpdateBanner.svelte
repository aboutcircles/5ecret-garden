<script lang="ts">
    import {popupControls} from "$lib/components/PopUp.svelte";
    import MigrateToV2 from "$lib/flows/migrateToV2/0_GetInvited.svelte";

    async function migrateToV2() {
        $popupControls?.open({
            title: "Migrate to v2",
            component: MigrateToV2,
            props: {}
        });
    }
</script>
<div class="w-full bg-blue-100 border-t-4 mb-4 border-blue-500 rounded-b text-blue-900 px-4 py-3 shadow-md cursor-pointer fixed top-16 z-10"
     on:click={() => migrateToV2()}
     role="alert">
    <div class="flex">
        <div>
            <p class="font-bold">Circles V2 is here!</p>
            <p class="text-sm">Migrate your avatar to Circles V2.</p>
        </div>
    </div>
</div>