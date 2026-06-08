<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
</script>

<div
  aria-hidden="true"
  style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:12px;overflow:hidden;display:flex;flex-direction:column;"
>
  <div style="width:100%;height:176px;background:{T.pageDeep};"></div>

  <div style="padding:12px;display:flex;flex-direction:column;gap:4px;">
    <div style="min-height:3rem;">
      <div style="height:16px;width:75%;background:rgba(0,0,0,0.07);border-radius:4px;margin-bottom:8px;"></div>
      <div style="height:16px;width:50%;background:rgba(0,0,0,0.07);border-radius:4px;"></div>
    </div>

    <div style="min-height:1.5rem;display:flex;align-items:center;justify-content:space-between;">
      <div style="height:16px;width:64px;background:rgba(0,0,0,0.07);border-radius:4px;"></div>
      <div style="height:20px;width:80px;background:rgba(0,0,0,0.07);border-radius:9999px;"></div>
    </div>

    <div style="min-height:1.5rem;display:flex;align-items:center;">
      <div style="height:16px;width:96px;background:rgba(0,0,0,0.07);border-radius:4px;"></div>
    </div>

    <div style="min-height:2.25rem;display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
      <div style="display:inline-flex;gap:8px;align-items:center;">
        <div style="height:32px;width:112px;background:rgba(0,0,0,0.07);border-radius:8px;"></div>
      </div>
      <div style="height:32px;width:64px;background:rgba(0,0,0,0.07);border-radius:8px;"></div>
    </div>
  </div>
</div>
