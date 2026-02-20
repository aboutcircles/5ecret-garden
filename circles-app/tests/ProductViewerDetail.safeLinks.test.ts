import { describe, it, expect } from 'vitest';
import { sanitizeUrl, jumpHref } from '../src/lib/shared/ui/content/markdown';

// Since we cannot easily test the Svelte component's derived state in this environment 
// without setting up a full component test suite, we test the logic that the component uses.

describe('ProductViewerDetail safe link logic', () => {
  const ipfsGatewayUrl = (cid: string) => `https://ipfs.io/ipfs/${cid}`;

  it('correctly derives safe jump links for product URL', () => {
    const productUrl = 'http://example.com';
    const productUrlSafe = typeof productUrl === 'string' ? sanitizeUrl(productUrl) : null;
    expect(productUrlSafe).toBe('http://example.com/');
    expect(jumpHref(productUrlSafe!)).toBe('/jump?to=http%3A%2F%2Fexample.com%2F');
  });

  it('correctly derives safe jump links for IPFS CID', () => {
    const productCid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const ipfsUrlSafe = productCid ? sanitizeUrl(ipfsGatewayUrl(productCid)) : null;
    expect(ipfsUrlSafe).toBe(`https://ipfs.io/ipfs/${productCid}`);
    expect(jumpHref(ipfsUrlSafe!)).toBe(`/jump?to=https%3A%2F%2Fipfs.io%2Fipfs%2F${productCid}`);
  });

  it('rejects dangerous product URLs', () => {
    const productUrl = 'javascript:alert(1)';
    const productUrlSafe = typeof productUrl === 'string' ? sanitizeUrl(productUrl) : null;
    expect(productUrlSafe).toBe(null);
  });
});
