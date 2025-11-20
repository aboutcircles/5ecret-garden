import type {CidV0} from './cid';
import {PinFailedError} from './errors';

export interface CirclesBindings {
    getLatestProfileCid(avatar: string): Promise<CidV0 | null>;

    getProfile(cid: CidV0): Promise<any | null>;

    putJsonLd(obj: any): Promise<CidV0>;

    updateAvatarProfileDigest(avatar: string, cid: CidV0): Promise<string>;

    // Optional: server-side canonicalization for comparison/debugging
    canonicalizeJsonLd?(obj: any): Promise<string>;
}

function ensureProfileShape(obj: any): any {
    const PROFILE_CTX = 'https://aboutcircles.com/contexts/circles-profile/';
    const p = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};

    if (typeof p['@type'] !== 'string') {
        p['@type'] = 'Profile';
    }

    const ctx = p['@context'];
    if (typeof ctx === 'string') {
        if (ctx !== PROFILE_CTX) {
            p['@context'] = [PROFILE_CTX, ctx];
        }
    } else if (Array.isArray(ctx)) {
        const strings = ctx.filter((x) => typeof x === 'string');
        p['@context'] = strings.includes(PROFILE_CTX) ? ctx : [PROFILE_CTX, ...ctx];
    } else {
        p['@context'] = PROFILE_CTX;
    }

    if (!p.namespaces || typeof p.namespaces !== 'object' || Array.isArray(p.namespaces)) {
        p.namespaces = {};
    }
    if (!p.signingKeys || typeof p.signingKeys !== 'object' || Array.isArray(p.signingKeys)) {
        p.signingKeys = {};
    }

    return p;
}

function ensureNamespaceChunkShape(obj: any): any {
    const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
    const h = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};

    if (typeof h['@type'] !== 'string') {
        h['@type'] = 'NamespaceChunk';
    }

    const ctx = h['@context'];
    if (typeof ctx === 'string') {
        if (ctx !== NAMESPACE_CTX) {
            h['@context'] = [NAMESPACE_CTX, ctx];
        }
    } else if (Array.isArray(ctx)) {
        const strings = ctx.filter((x: any) => typeof x === 'string');
        h['@context'] = strings.includes(NAMESPACE_CTX) ? ctx : [NAMESPACE_CTX, ...ctx];
    } else {
        h['@context'] = NAMESPACE_CTX;
    }

    if (!Array.isArray(h.links)) {
        h.links = [];
    }
    if (!('prev' in h) || (h.prev !== null && typeof h.prev !== 'string')) {
        h.prev = null;
    }

    return h;
}

function ensureNameIndexDocShape(obj: any): any {
    const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
    const idx = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};

    if (typeof idx['@type'] !== 'string') {
        idx['@type'] = 'NameIndexDoc';
    }

    const ctx = idx['@context'];
    if (typeof ctx === 'string') {
        if (ctx !== NAMESPACE_CTX) {
            idx['@context'] = [NAMESPACE_CTX, ctx];
        }
    } else if (Array.isArray(ctx)) {
        const strings = ctx.filter((x: any) => typeof x === 'string');
        idx['@context'] = strings.includes(NAMESPACE_CTX) ? ctx : [NAMESPACE_CTX, ...ctx];
    } else {
        idx['@context'] = NAMESPACE_CTX;
    }

    if (typeof idx.head !== 'string') {
        idx.head = '';
    }
    if (!idx.entries || typeof idx.entries !== 'object' || Array.isArray(idx.entries)) {
        idx.entries = {};
    }

    return idx;
}

export async function loadProfileOrInit(
    circles: CirclesBindings,
    avatar: string
): Promise<{ profile: any; profileCid: CidV0 | null }> {
    const latest = await circles.getLatestProfileCid(avatar);
    if (!latest) {
        return {profile: ensureProfileShape({}), profileCid: null};
    }
    const raw = await fetchIpfsJson(latest);
    return {profile: ensureProfileShape(raw ?? {}), profileCid: latest};
}

/**
 * Fetches JSON data from an IPFS gateway using the given CID.
 *
 * @param cid - The IPFS CID (CIDv0 or CIDv1) to fetch
 * @param gatewayUrl - Optional custom IPFS gateway URL (defaults to public gateway)
 * @returns Promise resolving to the parsed JSON object
 * @throws Error if the request fails or response is not valid JSON
 */
export async function fetchIpfsJson(cid: string, gatewayUrl?: string): Promise<any> {
    // Use default public IPFS gateway if none provided
    const url = gatewayUrl
        ? `${gatewayUrl}/ipfs/${cid}`
        : `https://ipfs.io/ipfs/${cid}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`IPFS request failed: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
            // Some gateways might return HTML error pages
            const text = await response.text();
            throw new Error(`Unexpected content type: ${contentType}. Response: ${text.substring(0, 200)}...`);
        }

        const json = await response.json();

        // Basic validation - check if we got a reasonable JSON object
        if (typeof json !== 'object' || Array.isArray(json)) {
            throw new Error(`Expected JSON object but received ${Array.isArray(json) ? 'array' : typeof json}`);
        }

        return json;
    } catch (error) {
        // Enhance error with CID context for better debugging
        const enhancedError = error instanceof Error
            ? new Error(`Failed to fetch IPFS CID ${cid}: ${error.message}`)
            : new Error(`Unknown error fetching IPFS CID ${cid}`);

        throw enhancedError;
    }
}

export async function loadIndex(
    circles: CirclesBindings,
    indexCid: CidV0 | null
): Promise<{ index: any; head: any; headCid: CidV0 | null }> {
    if (!indexCid) {
        const index = ensureNameIndexDocShape({head: '', entries: {}});
        const head = ensureNamespaceChunkShape({prev: null, links: []});
        return {index, head, headCid: null};
    }

    const indexRaw = await fetchIpfsJson(indexCid); // reuse getter for generic JSON fetch
    const index = ensureNameIndexDocShape(indexRaw ?? {head: '', entries: {}});
    const headCid = (index?.head as CidV0 | undefined) ?? null;

    const headRaw = headCid ? await fetchIpfsJson(headCid) : {prev: null, links: []};
    const head = ensureNamespaceChunkShape(headRaw ?? {prev: null, links: []});
    return {index, head, headCid};
}

export function insertIntoHead(head: any, signedLink: any): { rotated: boolean; closedHead?: any } {
    head = ensureNamespaceChunkShape(head);

    if (!head.links) head.links = [];
    const needsRotation = head.links.length === 100;
    let closedHead: any | undefined;

    if (needsRotation) {
        closedHead = ensureNamespaceChunkShape({
            '@context': head['@context'],
            '@type': head['@type'],
            prev: head.prev ?? null,
            links: Array.isArray(head.links) ? [...head.links] : [],
        });

        head.prev = null; // will be set to closedCid later
        head.links = [];
    }

    const targetName = String(signedLink.name || '').toLowerCase();
    const idx = head.links.findIndex((l: any) => String(l?.name || '').toLowerCase() === targetName);
    if (idx >= 0) {
        head.links[idx] = signedLink;
    } else {
        head.links.push(signedLink);
    }

    return {rotated: needsRotation, closedHead};
}

export async function saveHeadAndIndex(
    circles: CirclesBindings,
    head: any,
    index: any,
    closedHead?: any
): Promise<{ headCid: CidV0; indexCid: CidV0 }> {
    const normalizedHead = ensureNamespaceChunkShape(head);
    const normalizedIndex = ensureNameIndexDocShape(index);

    let closedCid: CidV0 | undefined;

    if (closedHead) {
        const normalizedClosed = ensureNamespaceChunkShape(closedHead);
        try {
            closedCid = await circles.putJsonLd(normalizedClosed);
            normalizedHead.prev = closedCid;

            if (Array.isArray(normalizedClosed.links)) {
                for (const l of normalizedClosed.links) {
                    if (l && l.name) {
                        normalizedIndex.entries[l.name] = closedCid;
                    }
                }
            }
        } catch (e: any) {
            throw new PinFailedError('head', String(e?.message ?? e));
        }
    }

    let headCid: CidV0;
    try {
        headCid = await circles.putJsonLd(normalizedHead);
    } catch (e: any) {
        throw new PinFailedError('head', String(e?.message ?? e));
    }

    if (Array.isArray(normalizedHead.links)) {
        for (const l of normalizedHead.links) {
            if (l && l.name) {
                normalizedIndex.entries[l.name] = headCid;
            }
        }
    }
    normalizedIndex.head = headCid;

    try {
        const indexCid = await circles.putJsonLd(normalizedIndex);
        return {headCid, indexCid};
    } catch (e: any) {
        throw new PinFailedError('index', String(e?.message ?? e));
    }
}

export async function rebaseAndSaveProfile(
    circles: CirclesBindings,
    avatar: string,
    mutator: (profile: any) => void
): Promise<CidV0> {
    const latest = await circles.getLatestProfileCid(avatar);

    let base: any = {};
    if (latest) {
        try {
            // Load the full JSON-LD as stored on IPFS to preserve all profile fields
            base = await fetchIpfsJson(latest);
        } catch (_err) {
            // Fallback to typed getter; if that fails too, start from empty
            try {
                base = (await circles.getProfile(latest)) ?? {};
            } catch {
                base = {};
            }
        }
    }

    let profile = ensureProfileShape(base ?? {});
    // Allow caller to mutate specific fields (e.g., namespaces)
    mutator(profile);
    // Re-ensure minimal required shape without removing other fields
    profile = ensureProfileShape(profile);

    try {
        const cid = await circles.putJsonLd(profile);
        return cid;
    } catch (e: any) {
        throw new PinFailedError('profile', String(e?.message ?? e));
    }
}
