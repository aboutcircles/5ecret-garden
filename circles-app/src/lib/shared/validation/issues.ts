export interface ValidationIssue {
  code: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}
