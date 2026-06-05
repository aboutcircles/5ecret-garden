import { Interface, ZeroAddress, concat, zeroPadValue } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';

// Safe v1.3 execTransaction ABI. Same shape that produced the failing tx the
// user reported — the only thing changing is what `to` points at: a wrapped
// inner Safe call instead of the group contract directly.
const safeExecIface = new Interface([
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) external payable returns (bool success)',
]);

// Pre-validated Safe signature payload. When the Safe checks signatures and
// sees `v == 1`, it treats `r` as the address of an approver. If that address
// equals msg.sender, the call is considered authorized without a stored
// approveHash. We rely on this here: the OUTER call is sent by the runner
// Safe (= our msg.sender on the inner Safe's execTransaction), so passing the
// runner Safe address in `r` satisfies the inner Safe's signature check.
//
// Layout (65 bytes / one signature):
//   r (32 bytes) = address, left-padded
//   s (32 bytes) = 0
//   v (1 byte)   = 0x01 — pre-validated marker
function buildPreValidatedSignature(approver: Address): string {
  return concat([zeroPadValue(approver, 32), zeroPadValue('0x', 32), '0x01']);
}

// Wrap an inner contract call in the calldata of a single
// `ownerSafe.execTransaction(...)`. The OUTER wrapper (= the runner Safe's
// own execTransaction) is built by the SDK runner; we just supply this as
// `data` to `runner.sendTransaction(...)`.
export function buildNestedSafeCalldata(params: {
  innerTo: Address;
  innerData: string;
  innerValue?: bigint;
  runnerSafeAddress: Address;
}): string {
  const signatures = buildPreValidatedSignature(params.runnerSafeAddress);
  return safeExecIface.encodeFunctionData('execTransaction', [
    params.innerTo,
    params.innerValue ?? 0n,
    params.innerData,
    0, // operation = Call (1 would be DelegateCall — we never want that here)
    0, // safeTxGas
    0, // baseGas
    0, // gasPrice
    ZeroAddress,
    ZeroAddress,
    signatures,
  ]);
}
