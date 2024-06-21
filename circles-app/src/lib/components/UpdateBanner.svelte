<script lang="ts">
    import {goto} from "$app/navigation";

    async function migrateToV2() {
        await goto("/migrate-to-v2");
    }
</script>
<div class="bg-blue-100 border-t-4 mb-4 border-blue-500 rounded-b text-blue-900 px-4 py-3 shadow-md cursor-pointer"
     on:click={() => migrateToV2()}
     role="alert">
    <div class="flex">
        <div>
            <p class="font-bold">Circles V2 is here!</p>
            <p class="text-sm">Migrate your avatar to Circles V2.</p>
        </div>
    </div>
</div>