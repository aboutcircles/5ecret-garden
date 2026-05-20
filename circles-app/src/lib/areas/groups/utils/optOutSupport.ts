import { probeGroupCapabilities } from './groupKind';

// Backwards-compatible wrapper: opt-out support is one capability among
// several, all probed by `groupKind.ts`. Existing callers (LeaveGroup.svelte,
// GroupRowView.svelte) keep working unchanged.
export async function probeOptOutSupport(address: string): Promise<boolean> {
  try {
    const caps = await probeGroupCapabilities(address);
    return caps.optOut;
  } catch {
    return false;
  }
}
