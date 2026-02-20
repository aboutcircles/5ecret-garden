<script lang="ts">
  import type { ValidationIssue } from '$lib/shared/validation/issues';

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

<label class="form-control">
  {#if label}
    <span class="label-text">
      {label}{required ? ' *' : ''}
    </span>
  {/if}
  <slot />
  {#if help || hasIssues}
    <span class={`label-text-alt ${hasIssues ? 'text-error' : 'text-base-content/60'}`}>
      {hasIssues ? issueMessage : help}
    </span>
  {/if}
</label>

