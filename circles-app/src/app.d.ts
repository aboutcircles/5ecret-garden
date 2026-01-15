// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  interface Window {
    ethereum: any;
  }
}

// MDsveX file declarations
declare module '*.svx' {
  import type { SvelteComponent } from 'svelte';
  const component: typeof SvelteComponent;
  export default component;
}

export {};
