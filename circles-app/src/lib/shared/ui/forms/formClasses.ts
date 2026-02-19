import type { ValidationIssue } from '$lib/shared/validation/issues';

type IssuesCarrier = { issues: ValidationIssue[] };

const hasIssues = (field?: IssuesCarrier) =>
  Boolean(field && field.issues.length > 0);

export const inputClass = (field?: IssuesCarrier) =>
  `input input-bordered input-sm w-full${hasIssues(field) ? ' input-error' : ''}`;

export const textareaClass = (field?: IssuesCarrier) =>
  `textarea textarea-bordered textarea-sm w-full min-h-24${hasIssues(field) ? ' textarea-error' : ''}`;

export const selectClass = (field?: IssuesCarrier) =>
  `select select-bordered select-sm w-full${hasIssues(field) ? ' select-error' : ''}`;

export const checkboxClass = () => 'checkbox checkbox-sm';

export const radioClass = () => 'radio radio-sm';

export const toggleClass = () => 'toggle toggle-sm';
