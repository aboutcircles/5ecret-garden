<script lang="ts">
  import { T } from '$lib/design-system/tokens';
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:12px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Overview</h2>
  <p style="font-size:13px;color:{T.inkMuted};margin:0;">
    The kitchen sink now follows the send-flow gold standard: only core, reusable flow/layout primitives stay in the
    active showcase. Legacy and broad demos are moved into a deprecated area.
  </p>

  <ul class="list-disc pl-5 text-sm opacity-80 space-y-1">
    <li><a class="link" href="/kitchen-sink/golden">Golden Components & Layouts</a> — flow headers, decoration, alerts, action bars, row frame, and clean page scaffold patterns.</li>
    <li><a class="link" href="/kitchen-sink/deprecated">Deprecated Showcase</a> — legacy kitchen sink categories retained temporarily for migration reference.</li>
  </ul>
</section>
