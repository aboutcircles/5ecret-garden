/**
 * Fetch JSON from an IPFS gateway. This is intentionally minimal and can be
 * replaced by bindings.getJsonLd when you have your own gateway.
 */
export async function fetchIpfsJson(cid, gatewayUrl) {
    const url = (gatewayUrl ?? 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com') + '/ipfs/' + cid;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
        throw new Error(`Failed to fetch IPFS JSON: ${res.status} ${res.statusText}`);
    }
    return await res.json();
}
export function ensureProfileShape(obj) {
    const PROFILE_CTX = 'https://aboutcircles.com/contexts/circles-profile/';
    const prof = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    if (typeof prof['@type'] !== 'string')
        prof['@type'] = 'Profile';
    prof['@context'] = PROFILE_CTX;
    if (!prof.namespaces || typeof prof.namespaces !== 'object' || Array.isArray(prof.namespaces)) {
        prof.namespaces = {};
    }
    if (!prof.signingKeys || typeof prof.signingKeys !== 'object' || Array.isArray(prof.signingKeys)) {
        prof.signingKeys = {};
    }
    return prof;
}
export function ensureNamespaceChunkShape(obj) {
    const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
    const c = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    if (typeof c['@type'] !== 'string')
        c['@type'] = 'NamespaceChunk';
    c['@context'] = NAMESPACE_CTX;
    if (!Array.isArray(c.links))
        c.links = [];
    if (!('prev' in c) || (c.prev !== null && typeof c.prev !== 'string'))
        c.prev = null;
    return c;
}
export function ensureNameIndexDocShape(obj) {
    const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
    const idx = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    if (typeof idx['@type'] !== 'string')
        idx['@type'] = 'NameIndexDoc';
    idx['@context'] = NAMESPACE_CTX;
    if (typeof idx.head !== 'string')
        idx.head = '';
    if (!idx.entries || typeof idx.entries !== 'object' || Array.isArray(idx.entries)) {
        idx.entries = {};
    }
    return idx;
}
export async function loadProfileOrInit(bindings, avatar) {
    const latest = await bindings.getLatestProfileCid(avatar);
    if (latest) {
        const prof = await bindings.getJsonLd(latest);
        return { profile: ensureProfileShape(prof), profileCid: latest };
    }
    const profile = ensureProfileShape({
        '@context': 'https://aboutcircles.com/contexts/circles-profile/',
        '@type': 'Profile',
        avatar,
        namespaces: {},
    });
    return { profile, profileCid: null };
}
export async function loadIndex(bindings, indexCid) {
    if (!indexCid) {
        const index = ensureNameIndexDocShape({});
        const head = ensureNamespaceChunkShape({});
        return { index, head, headCid: null };
    }
    const index = ensureNameIndexDocShape(await bindings.getJsonLd(indexCid));
    let head;
    let headCid = null;
    if (index.head) {
        headCid = index.head;
        head = ensureNamespaceChunkShape(await bindings.getJsonLd(index.head));
    }
    else {
        head = ensureNamespaceChunkShape({});
    }
    return { index, head, headCid };
}
export function insertIntoHead(head, signedLink) {
    const links = Array.isArray(head.links) ? head.links : [];
    let rotated = false;
    let closedHead;
    if (links.length === 100) {
        closedHead = ensureNamespaceChunkShape({ ...head, links: [...links] });
        head.links = [];
        rotated = true;
    }
    const nameLc = (signedLink.name || '').toLowerCase();
    let replaced = false;
    const nextLinks = (Array.isArray(head.links) ? head.links : []).map((l) => {
        if (!replaced && typeof l?.name === 'string' && l.name.toLowerCase() === nameLc) {
            replaced = true;
            return signedLink;
        }
        return l;
    });
    if (!replaced)
        nextLinks.push(signedLink);
    head.links = nextLinks;
    return rotated ? { rotated: true, closedHead } : { rotated: false };
}
export async function saveHeadAndIndex(bindings, head, index, closedHead) {
    const normalizedHead = ensureNamespaceChunkShape(head);
    const normalizedIndex = ensureNameIndexDocShape(index);
    let closedCid;
    if (closedHead) {
        const normalizedClosed = ensureNamespaceChunkShape(closedHead);
        closedCid = await bindings.putJsonLd(normalizedClosed);
        normalizedHead.prev = closedCid;
        if (Array.isArray(normalizedClosed.links)) {
            for (const l of normalizedClosed.links) {
                if (l && l.name)
                    normalizedIndex.entries[l.name] = closedCid;
            }
        }
    }
    const headCid = await bindings.putJsonLd(normalizedHead);
    if (Array.isArray(normalizedHead.links)) {
        for (const l of normalizedHead.links) {
            if (l && l.name)
                normalizedIndex.entries[l.name] = headCid;
        }
    }
    normalizedIndex.head = headCid;
    const indexCid = await bindings.putJsonLd(normalizedIndex);
    return { headCid, indexCid };
}
export async function rebaseAndSaveProfile(bindings, avatar, mutator) {
    const { profile } = await loadProfileOrInit(bindings, avatar);
    mutator(profile);
    const profileCid = await bindings.putJsonLd(profile);
    return profileCid;
}
