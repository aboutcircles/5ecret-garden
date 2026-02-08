<script lang="ts">
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';

  let markdownValue = $state('## Kitchen sink markdown\n\n- Item A\n- Item B\n\n[Open Circles](https://aboutcircles.com)');
  const markdownPreview = '# Rendered markdown\n\nThis is **bold**, *italic*, and [safe jump link](https://aboutcircles.com).';
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Markdown</h2>

  <div class="space-y-2">
    <h3 class="font-medium">Renderer</h3>
    <Markdown content={markdownPreview} class="prose prose-sm max-w-none" />
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Editor</h3>
    <MarkdownEditor bind:value={markdownValue} rows={5} />
  </div>
</section>
