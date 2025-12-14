// lib/profile/namespacesEditor.ts
import type { CidV0 } from '$lib/offers/cid';
import type { ProfilesBindings } from '@circles-market/sdk';
import { loadIndex, rebaseAndSaveProfile } from '@circles-market/sdk';
import type { Address } from '@circles-sdk/utils';

export type LoadedNamespaceLink = {
    link: any;          // JSON-LD CustomDataLink as stored on IPFS
    chunkCid: CidV0;    // NamespaceChunk CID
    indexInChunk: number;
};

export type NamespaceLinksResult = {
    links: LoadedNamespaceLink[];
    indexCid: CidV0 | null;
    headCid: CidV0 | null;
};

/**
 * Best-effort loader for all links in a namespace:
 * - follows head → prev → … chain
 * - preserves array order within each chunk
 * - returns newest-first by storage (head first)
 */
export async function loadNamespaceLinks(
    circles: ProfilesBindings,
    indexCid: CidV0 | null
): Promise<NamespaceLinksResult> {
    if (!indexCid) {
        return { links: [], indexCid: null, headCid: null };
    }

    const { head, headCid } = await loadIndex(circles, indexCid);
    if (!headCid) {
        return { links: [], indexCid, headCid: null };
    }

    const all: LoadedNamespaceLink[] = [];

    let curCid: CidV0 | null = headCid.startsWith("Qm") ? headCid as CidV0 : null;
    let curChunk: any = head;

    while (curCid) {
        const norm = normalizeChunk(curChunk);
        const linksArray: any[] = Array.isArray(norm.links) ? norm.links : [];

        for (let i = 0; i < linksArray.length; i++) {
            const link = linksArray[i];
            if (!link || typeof link !== 'object') {
                continue;
            }
            all.push({ link, chunkCid: curCid, indexInChunk: i });
        }

        const prev = norm.prev as CidV0 | null;
        if (!prev) {
            break;
        }

        curCid = prev;
        curChunk = await circles.getJsonLd(prev);
    }

    return { links: all, indexCid, headCid: headCid as CidV0 };
}

type ChunkShape = {
    '@context': string;
    '@type': string;
    prev: CidV0 | null;
    links: any[];
};

function normalizeChunk(obj: any): ChunkShape {
    const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
    const root = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};

    let ctx = root['@context'];
    if (typeof ctx === 'string') {
        if (ctx !== NAMESPACE_CTX) {
            ctx = [NAMESPACE_CTX, ctx];
        }
    } else if (Array.isArray(ctx)) {
        const strings = ctx.filter((x: any) => typeof x === 'string');
        ctx = strings.includes(NAMESPACE_CTX) ? ctx : [NAMESPACE_CTX, ...ctx];
    } else {
        ctx = NAMESPACE_CTX;
    }

    let type = root['@type'];
    if (typeof type !== 'string') {
        type = 'NamespaceChunk';
    }

    const links = Array.isArray(root.links) ? root.links : [];
    const prev = typeof root.prev === 'string' ? (root.prev as CidV0) : null;

    return {
        '@context': ctx,
        '@type': type,
        prev,
        links
    };
}

/**
 * Rewrites a namespace for (avatar, namespaceKey) from a *complete* set of links.
 *
 * - If links.length === 0: remove the namespace from the profile (no new index/chunk).
 * - If 1 ≤ links.length ≤ 100: create a single NamespaceChunk (prev=null) and NameIndexDoc
 *   pointing all entries at that head.
 * - If links.length > 100: currently not supported (throws).
 *
 * In both cases the updated profile CID is pinned and the on-chain name registry
 * is updated via CirclesBindings.updateAvatarProfileDigest.
 */
export async function rewriteNamespaceFromLinks(
    circles: ProfilesBindings,
    avatar: Address,
    namespaceKey: Address,
    links: any[]
): Promise<{ indexCid: CidV0 | null }> {
    const count = links.length;

    if (count === 0) {
        // Remove the namespace entry from the profile.
        const profileCid = await rebaseAndSaveProfile(circles, avatar, (prof: any) => {
            if (!prof.namespaces || typeof prof.namespaces !== 'object') {
                prof.namespaces = {};
            }
            delete prof.namespaces[namespaceKey];
        });

        await circles.updateAvatarProfileDigest(avatar, profileCid);
        return { indexCid: null };
    }

    if (count > 100) {
        throw new Error(
            `Namespace editing is not supported for namespaces with more than 100 links (found ${count}).`
        );
    }

    // Build a fresh NamespaceChunk with all remaining links.
    const chunk: ChunkShape = {
        '@context': 'https://aboutcircles.com/contexts/circles-namespace/',
        '@type': 'NamespaceChunk',
        prev: null,
        links: links
    };

    const headCid = (await circles.putJsonLd(chunk)) as CidV0;

    const index: any = {
        '@context': 'https://aboutcircles.com/contexts/circles-namespace/',
        '@type': 'NameIndexDoc',
        head: headCid,
        entries: {} as Record<string, CidV0>
    };

    for (const l of links) {
        const name = String(l?.name ?? '');
        if (!name) continue;
        index.entries[name] = headCid;
    }

    const indexCid = (await circles.putJsonLd(index)) as CidV0;

    // Rebase profile, update namespace pointer, then update on-chain registry.
    const profileCid = await rebaseAndSaveProfile(circles, avatar, (prof: any) => {
        if (!prof.namespaces || typeof prof.namespaces !== 'object') {
            prof.namespaces = {};
        }
        prof.namespaces[namespaceKey] = indexCid;
    });

    await circles.updateAvatarProfileDigest(avatar, profileCid);

    return { indexCid };
}
