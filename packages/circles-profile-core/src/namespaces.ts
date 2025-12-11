import type { CustomDataLink } from './links';

export type Cid = string;

export interface ProfilesBindings {
  putJsonLd(obj: any): Promise<Cid>;
  getJsonLd(cid: Cid): Promise<any>;
  getLatestProfileCid(avatar: string): Promise<Cid | null>;
  updateAvatarProfileDigest(avatar: string, profileCid: Cid): Promise<string | void>;
  canonicalizeJsonLd?(obj: any): Promise<string> | string;
}

/**
 * Fetch JSON from an IPFS gateway. This is intentionally minimal and can be
 * replaced by bindings.getJsonLd when you have your own gateway.
 */
export async function fetchIpfsJson(cid: string, gatewayUrl?: string): Promise<any> {
  const url = (gatewayUrl ?? 'https://ipfs.io') + '/ipfs/' + cid;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to fetch IPFS JSON: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export function ensureProfileShape(obj: any): any {
  const PROFILE_CTX = 'https://aboutcircles.com/contexts/circles-profile/';
  const prof = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  if (typeof prof['@type'] !== 'string') prof['@type'] = 'Profile';
  prof['@context'] = PROFILE_CTX;
  if (!prof.namespaces || typeof prof.namespaces !== 'object' || Array.isArray(prof.namespaces)) {
    prof.namespaces = {};
  }
  if (!prof.signingKeys || typeof prof.signingKeys !== 'object' || Array.isArray(prof.signingKeys)) {
    prof.signingKeys = {};
  }
  return prof;
}

export function ensureNamespaceChunkShape(obj: any): any {
  const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
  const c = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  if (typeof c['@type'] !== 'string') c['@type'] = 'NamespaceChunk';
  c['@context'] = NAMESPACE_CTX;
  if (!Array.isArray(c.links)) c.links = [] as CustomDataLink[];
  if (!('prev' in c) || (c.prev !== null && typeof c.prev !== 'string')) c.prev = null;
  return c;
}

export function ensureNameIndexDocShape(obj: any): any {
  const NAMESPACE_CTX = 'https://aboutcircles.com/contexts/circles-namespace/';
  const idx = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  if (typeof idx['@type'] !== 'string') idx['@type'] = 'NameIndexDoc';
  idx['@context'] = NAMESPACE_CTX;
  if (typeof idx.head !== 'string') idx.head = '';
  if (!idx.entries || typeof idx.entries !== 'object' || Array.isArray(idx.entries)) {
    idx.entries = {} as Record<string, string>;
  }
  return idx;
}

export async function loadProfileOrInit(
  bindings: ProfilesBindings,
  avatar: string,
): Promise<{ profile: any; profileCid: Cid | null }> {
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

export async function loadIndex(
  bindings: ProfilesBindings,
  indexCid: Cid | null,
): Promise<{ index: any; head: any; headCid: Cid | null }> {
  if (!indexCid) {
    const index = ensureNameIndexDocShape({});
    const head = ensureNamespaceChunkShape({});
    return { index, head, headCid: null };
  }
  const index = ensureNameIndexDocShape(await bindings.getJsonLd(indexCid));
  let head: any;
  let headCid: string | null = null;
  if (index.head) {
    headCid = index.head;
    head = ensureNamespaceChunkShape(await bindings.getJsonLd(index.head));
  } else {
    head = ensureNamespaceChunkShape({});
  }
  return { index, head, headCid };
}

export function insertIntoHead(
  head: any,
  signedLink: CustomDataLink,
): { rotated: boolean; closedHead?: any } {
  const links: CustomDataLink[] = Array.isArray(head.links) ? head.links : [];
  let rotated = false;
  let closedHead: any | undefined;

  if (links.length === 100) {
    closedHead = ensureNamespaceChunkShape({ ...head, links: [...links] });
    head.links = [] as CustomDataLink[];
    rotated = true;
  }

  const nameLc = (signedLink.name || '').toLowerCase();
  let replaced = false;
  const nextLinks: CustomDataLink[] = (Array.isArray(head.links) ? head.links : []).map((l: any) => {
    if (!replaced && typeof l?.name === 'string' && l.name.toLowerCase() === nameLc) {
      replaced = true;
      return signedLink;
    }
    return l;
  });
  if (!replaced) nextLinks.push(signedLink);
  head.links = nextLinks;

  return rotated ? { rotated: true, closedHead } : { rotated: false };
}

export async function saveHeadAndIndex(
  bindings: ProfilesBindings,
  head: any,
  index: any,
  closedHead?: any,
): Promise<{ headCid: Cid; indexCid: Cid }> {
  const normalizedHead = ensureNamespaceChunkShape(head);
  const normalizedIndex = ensureNameIndexDocShape(index);

  let closedCid: Cid | undefined;
  if (closedHead) {
    const normalizedClosed = ensureNamespaceChunkShape(closedHead);
    closedCid = await bindings.putJsonLd(normalizedClosed);
    normalizedHead.prev = closedCid;
    if (Array.isArray(normalizedClosed.links)) {
      for (const l of normalizedClosed.links) {
        if (l && l.name) normalizedIndex.entries[l.name] = closedCid;
      }
    }
  }

  const headCid = await bindings.putJsonLd(normalizedHead);
  if (Array.isArray(normalizedHead.links)) {
    for (const l of normalizedHead.links) {
      if (l && l.name) normalizedIndex.entries[l.name] = headCid;
    }
  }
  normalizedIndex.head = headCid;

  const indexCid = await bindings.putJsonLd(normalizedIndex);
  return { headCid, indexCid };
}

export async function rebaseAndSaveProfile(
  bindings: ProfilesBindings,
  avatar: string,
  mutator: (profile: any) => void,
): Promise<Cid> {
  const { profile } = await loadProfileOrInit(bindings, avatar);
  mutator(profile);
  const profileCid = await bindings.putJsonLd(profile);
  return profileCid;
}
