<script lang="ts">
  import { clearSession } from '$lib/shared/state/wallet.svelte';
</script>

<div class="w-full bg-base-100 border border-base-300 rounded-[14px] flex flex-col justify-center items-center p-8 gap-y-3 shadow-sm">
  <span class="loading loading-spinner loading-lg text-primary"></span>
  <p class="font-semibold text-base-content mt-2">Connecting your wallet…</p>
  <p class="text-sm text-base-content/60">Please wait</p>
  <button onclick={clearSession} class="btn btn-ghost btn-sm mt-2">Cancel</button>
</div>
