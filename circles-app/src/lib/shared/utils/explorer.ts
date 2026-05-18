const GNOSISSCAN_BASE = 'https://gnosisscan.io';

export function gnosisscanTxUrl(hash: string): string {
  return `${GNOSISSCAN_BASE}/tx/${hash}`;
}
