import type { CidV0 } from './cid';
import { PinFailedError } from './errors';

export interface CirclesBindings {
  getLatestProfileCid(avatar: string): Promise<CidV0 | null>;
  getProfile(cid: CidV0): Promise<any | null>;
  putJsonLd(obj: any): Promise<CidV0>;
  updateAvatarProfileDigest(avatar: string, cid: CidV0): Promise<string>;
}

export async function loadProfileOrInit(circles: CirclesBindings, avatar: string): Promise<{ profile: any; profileCid: CidV0 | null }>{
  const latest = await circles.getLatestProfileCid(avatar);
  if (!latest) {
    const profile = {
      '@context': 'https://aboutcircles.com/contexts/circles-profile/',
      '@type': 'Profile',
      namespaces: {},
      signingKeys: {},
    };
    return { profile, profileCid: null };
  }
  const json = await circles.getProfile(latest);
  return { profile: json ?? { '@context': 'https://aboutcircles.com/contexts/circles-profile/', '@type': 'Profile', namespaces: {}, signingKeys: {} }, profileCid: latest };
}

export async function loadIndex(circles: CirclesBindings, indexCid: CidV0 | null): Promise<{ index: any; head: any; headCid: CidV0 | null }>{
  if (!indexCid) {
    const index = { '@context': 'https://aboutcircles.com/contexts/circles-namespace/', '@type': 'NameIndexDoc', head: '', entries: {} };
    const head = { '@context': 'https://aboutcircles.com/contexts/circles-namespace/', '@type': 'NamespaceChunk', prev: null, links: [] as any[] };
    return { index, head, headCid: null };
  }
  const index = await circles.getProfile(indexCid); // reuse getter for generic JSON fetch
  const headCid = index?.head ?? null;
  const head = headCid ? await circles.getProfile(headCid) : { '@context': 'https://aboutcircles.com/contexts/circles-namespace/', '@type': 'NamespaceChunk', prev: null, links: [] };
  return { index, head, headCid };
}

export function insertIntoHead(head: any, signedLink: any): { rotated: boolean; closedHead?: any } {
  if (!head.links) head.links = [];
  const needsRotation = head.links.length === 100;
  let closedHead: any | undefined;
  if (needsRotation) {
    // Clone current head as a closed chunk to be pinned, then reset head for new links
    closedHead = {
      '@context': head['@context'] ?? 'https://aboutcircles.com/contexts/circles-namespace/',
      '@type': head['@type'] ?? 'NamespaceChunk',
      prev: head.prev ?? null,
      links: Array.isArray(head.links) ? [...head.links] : [],
    };
    head.prev = null; // will be set to closedCid in saveHeadAndIndex
    head.links = [];
  }
  // Replace or push by name in the (possibly new) head
  const targetName = String(signedLink.name || '').toLowerCase();
  const idx = head.links.findIndex((l: any) => String(l?.name || '').toLowerCase() === targetName);
  if (idx >= 0) head.links[idx] = signedLink; else head.links.push(signedLink);
  return { rotated: needsRotation, closedHead };
}

export async function saveHeadAndIndex(
  circles: CirclesBindings,
  head: any,
  index: any,
  closedHead?: any
): Promise<{ headCid: CidV0; indexCid: CidV0 }>{
  let closedCid: CidV0 | undefined;

  // 1) If rotated, pin the closed head and update entries -> closedCid
  if (closedHead) {
    try {
      closedCid = await circles.putJsonLd(closedHead);
      head.prev = closedCid;
      if (Array.isArray(closedHead.links)) {
        for (const l of closedHead.links) {
          if (l && l.name) index.entries[l.name] = closedCid;
        }
      }
    } catch (e: any) {
      // Consider this a head failure bucket-wise, as it's part of the rotation step prior to head pin
      throw new PinFailedError('head', String(e?.message ?? e));
    }
  }

  // 2) Pin current head and update entries -> headCid
  let headCid: CidV0;
  try {
    headCid = await circles.putJsonLd(head);
  } catch (e: any) {
    throw new PinFailedError('head', String(e?.message ?? e));
  }
  if (Array.isArray(head.links)) {
    for (const l of head.links) {
      if (l && l.name) index.entries[l.name] = headCid;
    }
  }
  index.head = headCid;

  // 3) Pin index
  try {
    const indexCid = await circles.putJsonLd(index);
    return { headCid, indexCid };
  } catch (e: any) {
    throw new PinFailedError('index', String(e?.message ?? e));
  }
}

export async function rebaseAndSaveProfile(circles: CirclesBindings, avatar: string, mutator: (profile: any) => void): Promise<CidV0> {
  const latest = await circles.getLatestProfileCid(avatar);
  let profile: any;
  if (!latest) {
    profile = { '@context': 'https://aboutcircles.com/contexts/circles-profile/', '@type': 'Profile', namespaces: {}, signingKeys: {} };
  } else {
    profile = (await circles.getProfile(latest)) ?? { '@context': 'https://aboutcircles.com/contexts/circles-profile/', '@type': 'Profile', namespaces: {}, signingKeys: {} };
  }
  mutator(profile);
  try {
    const cid = await circles.putJsonLd(profile);
    return cid;
  } catch (e: any) {
    throw new PinFailedError('profile', String(e?.message ?? e));
  }
}
