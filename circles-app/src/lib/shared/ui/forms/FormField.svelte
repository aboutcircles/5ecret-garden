<script lang="ts">
  import type { ValidationIssue } from '$lib/shared/validation/issues';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    label?: string;
    help?: string;
    field?: { issues: ValidationIssue[] };
    required?: boolean;
    issues?: ValidationIssue[];
  }

  let { label, help, field, required = false, issues }: Props = $props();

  const resolvedIssues = $derived(issues ?? field?.issues ?? []);
  const hasIssues = $derived(resolvedIssues.length > 0);
  const issueMessage = $derived(resolvedIssues[0]?.message ?? '');
</script>

<label style="display:flex;flex-direction:column;gap:6px;">
  {#if label}
    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">
      {label}{required ? ' *' : ''}
    </span>
  {/if}
  <slot />
  {#if help || hasIssues}
    <span style="font-size:11px;color:{hasIssues ? T.negative : T.inkMuted};">
      {hasIssues ? issueMessage : help}
    </span>
  {/if}
</label>
