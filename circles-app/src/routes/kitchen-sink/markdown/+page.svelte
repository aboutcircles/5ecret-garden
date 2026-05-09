<script lang="ts">
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';
  import { T } from '$lib/design-system/tokens';

  let markdownValue = $state('## Kitchen sink markdown\n\n- Item A\n- Item B\n\n[Open Circles](https://aboutcircles.com)');
  const markdownPreview = '# Rendered markdown\n\nThis is **bold**, *italic*, and [safe jump link](https://aboutcircles.com).';
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Markdown</h2>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Renderer</h3>
    <Markdown content={markdownPreview} class="prose prose-sm max-w-none" />
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Editor</h3>
    <MarkdownEditor bind:value={markdownValue} rows={5} />
  </div>
</section>
