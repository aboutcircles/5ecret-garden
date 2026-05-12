import { describe, expect, it } from 'vitest';
import {
  applyEditableLinkMetadata,
  buildReplacementLinkWithPayloadCid,
  replaceLoadedNamespaceLinkAt,
  type LoadedNamespaceLink,
} from '$lib/shared/model/profile/namespacesEditor';
import type { CustomDataLink } from '@circles-profile/core';

function mk(index: number, name = `link-${index}`): LoadedNamespaceLink {
  return {
    link: { name, cid: `QmPayload${index}` },
    chunkCid: `QmChunk${index}` as any,
    indexInChunk: index,
  };
}

function didThrow(fn: () => void): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

describe('replaceLoadedNamespaceLinkAt', () => {
  it('replaces one item and keeps order/length', () => {
    const links: LoadedNamespaceLink[] = [mk(0), mk(1), mk(2)];
    const replacement = { name: 'link-1', cid: 'QmNewPayload' };

    const next = replaceLoadedNamespaceLinkAt(links, 1, replacement);

    expect(next).toHaveLength(3);
    expect(next[0]).toBe(links[0]);
    expect(next[2]).toBe(links[2]);
    expect(next[1].link).toEqual(replacement);
    expect(next[1].chunkCid).toBe(links[1].chunkCid);
    expect(next[1].indexInChunk).toBe(links[1].indexInChunk);
  });

  it('does not mutate the original array', () => {
    const links: LoadedNamespaceLink[] = [mk(0), mk(1)];
    const replacement = { name: 'link-0', cid: 'QmEdited' };

    const next = replaceLoadedNamespaceLinkAt(links, 0, replacement);

    expect(next).not.toBe(links);
    expect(links[0].link).toEqual({ name: 'link-0', cid: 'QmPayload0' });
    expect(next[0].link).toEqual(replacement);
  });

  it('throws on invalid index', () => {
    const links: LoadedNamespaceLink[] = [mk(0)];
    expect(didThrow(() => replaceLoadedNamespaceLinkAt(links, -1, { name: 'x' }))).toBe(true);
    expect(didThrow(() => replaceLoadedNamespaceLinkAt(links, 1, { name: 'x' }))).toBe(true);
  });

  it('throws when replacement is not an object', () => {
    const links: LoadedNamespaceLink[] = [mk(0)];
    expect(didThrow(() => replaceLoadedNamespaceLinkAt(links, 0, null))).toBe(true);
    expect(didThrow(() => replaceLoadedNamespaceLinkAt(links, 0, ['not', 'object']))).toBe(true);
  });
});

describe('buildReplacementLinkWithPayloadCid', () => {
  it('preserves name and updates cid', () => {
    const original = {
      '@context': 'https://aboutcircles.com/contexts/circles-linking/',
      '@type': 'CustomDataLink',
      name: 'product/abc',
      cid: 'QmOld',
      encrypted: false,
      encryptionAlgorithm: null,
      encryptionKeyFingerprint: null,
      chainId: 100,
      signerAddress: '0x0000000000000000000000000000000000000001',
      signedAt: 1,
      nonce: '0x1234',
      signature: '',
    };

    const next = buildReplacementLinkWithPayloadCid(original, 'QmNewPayload');

    expect(next.name).toBe('product/abc');
    expect(next.cid).toBe('QmNewPayload');
    expect(next.signerAddress).toBe(original.signerAddress);
  });

  it('forces original name even if incoming object had weird shape', () => {
    const original = { name: 'keep/me', cid: 'QmOld', x: 1 };
    const next = buildReplacementLinkWithPayloadCid(original, 'QmNew');
    expect(next.name).toBe('keep/me');
    expect(next.cid).toBe('QmNew');
    expect(next.x).toBe(1);
  });

  it('throws on invalid inputs', () => {
    expect(didThrow(() => buildReplacementLinkWithPayloadCid(null, 'QmX'))).toBe(true);
    expect(didThrow(() => buildReplacementLinkWithPayloadCid([], 'QmX'))).toBe(true);
    expect(didThrow(() => buildReplacementLinkWithPayloadCid({ name: 'n' }, ''))).toBe(true);
  });
});

describe('applyEditableLinkMetadata', () => {
  const baseLink: CustomDataLink = {
    '@context': 'https://aboutcircles.com/contexts/circles-linking/',
    '@type': 'CustomDataLink',
    name: 'product/old',
    cid: 'Qm123',
    encrypted: false,
    encryptionAlgorithm: null,
    encryptionKeyFingerprint: null,
    chainId: 100,
    signerAddress: '0x0000000000000000000000000000000000000001',
    signedAt: 1,
    nonce: '0x00000000000000000000000000000000' as `0x${string}`,
    signature: '',
  };

  it('applies editable metadata fields', () => {
    const next = applyEditableLinkMetadata(baseLink, {
      name: 'product/new',
      encrypted: true,
      encryptionAlgorithm: 'x25519-xsalsa20-poly1305',
      encryptionKeyFingerprint: 'fp-01',
    });

    expect(next.name).toBe('product/new');
    expect(next.encrypted).toBe(true);
    expect(next.encryptionAlgorithm).toBe('x25519-xsalsa20-poly1305');
    expect(next.encryptionKeyFingerprint).toBe('fp-01');
    expect(next.cid).toBe('Qm123');
  });

  it('clears encryption fields when encrypted=false', () => {
    const link: CustomDataLink = {
      ...baseLink,
      encrypted: true,
      encryptionAlgorithm: 'algo',
      encryptionKeyFingerprint: 'fp',
    };

    const next = applyEditableLinkMetadata(link, {
      name: 'product/old',
      encrypted: false,
      encryptionAlgorithm: 'ignored',
      encryptionKeyFingerprint: 'ignored',
    });

    expect(next.encrypted).toBe(false);
    expect(next.encryptionAlgorithm).toBe(null);
    expect(next.encryptionKeyFingerprint).toBe(null);
  });

  it('throws for invalid name or invalid link', () => {
    expect(
      didThrow(() =>
        applyEditableLinkMetadata(null as unknown as CustomDataLink, {
          name: 'x',
          encrypted: false,
          encryptionAlgorithm: null,
          encryptionKeyFingerprint: null,
        })
      )
    ).toBe(true);

    expect(
      didThrow(() =>
        applyEditableLinkMetadata(
          { cid: 'Qm1' } as unknown as CustomDataLink,
          {
            name: '   ',
            encrypted: false,
            encryptionAlgorithm: null,
            encryptionKeyFingerprint: null,
          }
        )
      )
    ).toBe(true);
  });
});
