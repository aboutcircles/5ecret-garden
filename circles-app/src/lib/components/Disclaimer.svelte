<script lang="ts">
  let visible = $state(true);
</script>

{#if visible}
  <div
    class="w-full rounded-lg bg-yellow-100 border border-yellow-400 p-3 text-sm text-yellow-800 flex justify-between items-start"
  >
    <span>
      ⚠️ ANY DATA YOU SUBMIT WHEN CREATING YOUR CIRCLES PROFILE WILL BE
      PERMANENTLY STORED ON THE PUBLIC AND DECENTRALISED INTERPLANETARY FILE
      SYSTEM (IPFS) AND BLOCKCHAIN, AND CANNOT BE DELETED OR MODIFIED. IF YOU DO
      NOT WANT CERTAIN PERSONAL DATA OR INFORMATION TO BE PERMANENTLY PUBLIC, DO
      NOT SUBMIT IT THROUGH THE APP. FOR MORE DETAILS, PLEASE REVIEW THE <a
        href="/privacy-policy"
        target="_blank"
        class="underline">PRIVACY NOTICE</a
      >
      AND <a href="/terms" target="_blank" class="underline">TERMS OF USE</a>.
    </span>
    <button
      onclick={() => (visible = false)}
      class="ml-4 px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded-sm"
    >
      Dismiss
    </button>
  </div>
{/if}
