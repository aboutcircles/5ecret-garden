<script lang="ts">
  import { T } from '$lib/design-system/tokens';
</script>

<section style="border-radius:14px;border:1px solid rgba(176,112,20,0.4);background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Deprecated Showcase</h2>
  <p style="font-size:13px;color:{T.inkMuted};margin:0;">
    These kitchen sink pages are kept temporarily for migration/reference, but are no longer part of the active
    golden-pattern surface.
  </p>

  <ul class="list-disc pl-5 text-sm opacity-85 space-y-1">
    <li><a class="link" href="/kitchen-sink/state-feedback">State & Feedback</a></li>
    <li><a class="link" href="/kitchen-sink/layout-shell">Layout & Shell</a></li>
    <li><a class="link" href="/kitchen-sink/flows-domain">Flows & Domain</a></li>
    <li><a class="link" href="/kitchen-sink/data-types">Data & Types</a></li>
    <li><a class="link" href="/kitchen-sink/tabs">Tabs</a></li>
    <li><a class="link" href="/kitchen-sink/actions">Actions</a></li>
    <li><a class="link" href="/kitchen-sink/identity">Identity & Utility</a></li>
    <li><a class="link" href="/kitchen-sink/markdown">Markdown</a></li>
    <li><a class="link" href="/kitchen-sink/lists">Lists & Loading</a></li>
    <li><a class="link" href="/kitchen-sink/list-search-role-model">List/Search Role Model</a></li>
    <li><a class="link" href="/kitchen-sink/misc">Misc</a></li>
  </ul>
</section>
