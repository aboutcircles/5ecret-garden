// MDsveX file declarations — must be in an ambient (non-module) file
// so TypeScript treats `declare module '*.svx'` as a wildcard pattern.
declare module '*.svx' {
  import type { SvelteComponent } from 'svelte';
  const component: typeof SvelteComponent;
  export default component;
}
