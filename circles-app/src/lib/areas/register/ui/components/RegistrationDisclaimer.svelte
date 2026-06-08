<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
  let visible = $state(true);
</script>

{#if visible}
  <div style="width:100%;border-radius:8px;background:{T.butterSoft};border:1px solid rgba(176,112,20,0.35);padding:12px;font-size:12.5px;color:rgba(120,70,0,0.9);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
    <span>
      ⚠️ ANY DATA YOU SUBMIT WHEN CREATING YOUR CIRCLES PROFILE WILL BE
      PERMANENTLY STORED ON THE PUBLIC AND DECENTRALISED INTERPLANETARY FILE
      SYSTEM (IPFS) AND BLOCKCHAIN, AND CANNOT BE DELETED OR MODIFIED. IF YOU DO
      NOT WANT CERTAIN PERSONAL DATA OR INFORMATION TO BE PERMANENTLY PUBLIC, DO
      NOT SUBMIT IT THROUGH THE APP. FOR MORE DETAILS, PLEASE REVIEW THE <a
        href="/privacy-policy"
        target="_blank"
        style="text-decoration:underline;color:inherit;">PRIVACY NOTICE</a
      >
      AND <a href="/terms" target="_blank" style="text-decoration:underline;color:inherit;">TERMS OF USE</a>.
    </span>
    <button
      type="button"
      onclick={() => (visible = false)}
      style="flex-shrink:0;margin-left:4px;padding:2px 8px;border-radius:6px;border:1px solid rgba(176,112,20,0.35);background:rgba(176,112,20,0.1);cursor:pointer;font-size:12px;color:rgba(120,70,0,0.9);font-family:{T.fontSans};"
    >
      Dismiss
    </button>
  </div>
{/if}
