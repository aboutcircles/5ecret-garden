<script lang="ts">
    import {contactList} from "$lib/stores/contactList";
    import TotalBalance from "$lib/components/TotalBalance.svelte";
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div></div>
    <TotalBalance/>
    <div></div>
</div>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Contacts</div>
    <div class="overflow-x-auto">
        <table class="table w-full">
            <thead>
            <tr>
                <th>Name</th>
            </tr>
            </thead>
            <tbody>
            {#each Object.keys($contactList) as address}
                <tr>
                    <td>
                        <p class="font-semibold">
                            {#if $contactList[address].name}
                                {$contactList[address].name}
                            {:else}
                                {address}
                            {/if}
                        </p>
                        {#if $contactList[address].name}
                            <p class="text-xs text-gray-500">{address}</p>
                        {/if}
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
    </div>
</div>