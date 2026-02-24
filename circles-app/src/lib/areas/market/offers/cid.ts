// Minimal types for CIDv0 and Hex used across the app.
// The SDK now returns digest32 directly; no need for local base58 decoding.

export type Hex = `0x${string}`;
export type CidV0 = `Qm${string}`;
