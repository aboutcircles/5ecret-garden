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

// Note: readable-stream and bn.js resolve to untyped modules from node_modules
// and cannot have ambient module declarations here (TS would treat them as
// augmentations of unresolvable modules). Their implicit-any is harmless since
// they're consumed only by other third-party libraries.

export {};
