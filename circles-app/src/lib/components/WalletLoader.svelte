<script lang="ts">
  import { clearSession } from "$lib/stores/wallet";

    export let name: string;
  </script>
  
  <div
    class="w-full border rounded-lg flex flex-col justify-center items-center p-8 gap-y-2 shadow-sm"
  >
    <span class="loading loading-spinner loading-lg"></span>
    <h2 class="card-title mt-4">Connecting your {name} wallet ...</h2>
    <p>Please wait while we're loading your wallet</p>
    <button on:click={clearSession} class="btn btn-warning mt-4">Cancel</button>
  </div>
  