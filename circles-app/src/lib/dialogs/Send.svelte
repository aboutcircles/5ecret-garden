<script lang="ts">
    import SendFlow from "$lib/flows/SendFlow.svelte";
    import {page} from "$app/stores";
</script>

<dialog id="sendModal" class="modal">
    <div class="modal-box">
        <SendFlow></SendFlow>
    </div>
</dialog>
