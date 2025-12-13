var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CanonicalisationError: () => CanonicalisationError,
  ObjectTooLargeError: () => ObjectTooLargeError,
  buildLinkDraft: () => buildLinkDraft,
  canonicaliseLink: () => canonicaliseLink,
  ensureNameIndexDocShape: () => ensureNameIndexDocShape,
  ensureNamespaceChunkShape: () => ensureNamespaceChunkShape,
  ensureProfileShape: () => ensureProfileShape,
  fetchIpfsJson: () => fetchIpfsJson,
  insertIntoHead: () => insertIntoHead,
  loadIndex: () => loadIndex,
  loadProfileOrInit: () => loadProfileOrInit,
  rebaseAndSaveProfile: () => rebaseAndSaveProfile,
  saveHeadAndIndex: () => saveHeadAndIndex
});
module.exports = __toCommonJS(index_exports);

// src/namespaces.ts
async function fetchIpfsJson(cid, gatewayUrl) {
  const url = (gatewayUrl ?? "https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com") + "/ipfs/" + cid;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to fetch IPFS JSON: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}
function ensureProfileShape(obj) {
  const PROFILE_CTX = "https://aboutcircles.com/contexts/circles-profile/";
  const prof = obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  if (typeof prof["@type"] !== "string") prof["@type"] = "Profile";
  prof["@context"] = PROFILE_CTX;
  if (!prof.namespaces || typeof prof.namespaces !== "object" || Array.isArray(prof.namespaces)) {
    prof.namespaces = {};
  }
  if (!prof.signingKeys || typeof prof.signingKeys !== "object" || Array.isArray(prof.signingKeys)) {
    prof.signingKeys = {};
  }
  return prof;
}
function ensureNamespaceChunkShape(obj) {
  const NAMESPACE_CTX = "https://aboutcircles.com/contexts/circles-namespace/";
  const c = obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  if (typeof c["@type"] !== "string") c["@type"] = "NamespaceChunk";
  c["@context"] = NAMESPACE_CTX;
  if (!Array.isArray(c.links)) c.links = [];
  if (!("prev" in c) || c.prev !== null && typeof c.prev !== "string") c.prev = null;
  return c;
}
function ensureNameIndexDocShape(obj) {
  const NAMESPACE_CTX = "https://aboutcircles.com/contexts/circles-namespace/";
  const idx = obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  if (typeof idx["@type"] !== "string") idx["@type"] = "NameIndexDoc";
  idx["@context"] = NAMESPACE_CTX;
  if (typeof idx.head !== "string") idx.head = "";
  if (!idx.entries || typeof idx.entries !== "object" || Array.isArray(idx.entries)) {
    idx.entries = {};
  }
  return idx;
}
async function loadProfileOrInit(bindings, avatar) {
  const latest = await bindings.getLatestProfileCid(avatar);
  if (latest) {
    const prof = await bindings.getJsonLd(latest);
    return { profile: ensureProfileShape(prof), profileCid: latest };
  }
  const profile = ensureProfileShape({
    "@context": "https://aboutcircles.com/contexts/circles-profile/",
    "@type": "Profile",
    avatar,
    namespaces: {}
  });
  return { profile, profileCid: null };
}
async function loadIndex(bindings, indexCid) {
  if (!indexCid) {
    const index2 = ensureNameIndexDocShape({});
    const head2 = ensureNamespaceChunkShape({});
    return { index: index2, head: head2, headCid: null };
  }
  const index = ensureNameIndexDocShape(await bindings.getJsonLd(indexCid));
  let head;
  let headCid = null;
  if (index.head) {
    headCid = index.head;
    head = ensureNamespaceChunkShape(await bindings.getJsonLd(index.head));
  } else {
    head = ensureNamespaceChunkShape({});
  }
  return { index, head, headCid };
}
function insertIntoHead(head, signedLink) {
  const links = Array.isArray(head.links) ? head.links : [];
  let rotated = false;
  let closedHead;
  if (links.length === 100) {
    closedHead = ensureNamespaceChunkShape({ ...head, links: [...links] });
    head.links = [];
    rotated = true;
  }
  const nameLc = (signedLink.name || "").toLowerCase();
  let replaced = false;
  const nextLinks = (Array.isArray(head.links) ? head.links : []).map((l) => {
    if (!replaced && typeof (l == null ? void 0 : l.name) === "string" && l.name.toLowerCase() === nameLc) {
      replaced = true;
      return signedLink;
    }
    return l;
  });
  if (!replaced) nextLinks.push(signedLink);
  head.links = nextLinks;
  return rotated ? { rotated: true, closedHead } : { rotated: false };
}
async function saveHeadAndIndex(bindings, head, index, closedHead) {
  const normalizedHead = ensureNamespaceChunkShape(head);
  const normalizedIndex = ensureNameIndexDocShape(index);
  let closedCid;
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
async function rebaseAndSaveProfile(bindings, avatar, mutator) {
  const { profile } = await loadProfileOrInit(bindings, avatar);
  mutator(profile);
  const profileCid = await bindings.putJsonLd(profile);
  return profileCid;
}

// src/canonicalise.ts
var CanonicalisationError = class extends Error {
};
var ObjectTooLargeError = class extends Error {
};
function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  const keys = Object.keys(value).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(JSON.stringify(k) + ":" + canonicalize(value[k]));
  }
  return "{" + parts.join(",") + "}";
}
function toHex(bytes) {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function canonicaliseLink(link) {
  const required = [
    "@context",
    "@type",
    "name",
    "cid",
    "encrypted",
    "encryptionAlgorithm",
    "encryptionKeyFingerprint",
    "chainId",
    "signerAddress",
    "signedAt",
    "nonce",
    "signature"
  ];
  for (const k of required) {
    if (!(k in link)) throw new CanonicalisationError(`Missing key ${String(k)}`);
  }
  const preimage = { ...link };
  delete preimage.signature;
  const json = canonicalize(preimage);
  if (!json || typeof json !== "string" || json.length === 0) {
    throw new CanonicalisationError("Canonicalization produced empty output");
  }
  const bytes = new TextEncoder().encode(json);
  const cap = 8 * 1024 * 1024;
  if (bytes.length > cap) throw new ObjectTooLargeError("Link preimage exceeds 8 MiB");
  return bytes;
}
async function buildLinkDraft(args) {
  var _a;
  const now = args.nowSec ?? Math.floor(Date.now() / 1e3);
  const nonceBytes = new Uint8Array(16);
  if (!((_a = globalThis.crypto) == null ? void 0 : _a.getRandomValues)) {
    for (let i = 0; i < nonceBytes.length; i++) nonceBytes[i] = Math.floor(Math.random() * 256);
  } else {
    globalThis.crypto.getRandomValues(nonceBytes);
  }
  const nonce = toHex(nonceBytes);
  const link = {
    "@context": "https://aboutcircles.com/contexts/circles-linking/",
    "@type": "CustomDataLink",
    name: args.name,
    cid: args.cid,
    encrypted: false,
    encryptionAlgorithm: null,
    encryptionKeyFingerprint: null,
    chainId: args.chainId,
    signerAddress: args.signerAddress,
    signedAt: now,
    nonce,
    signature: ""
  };
  return link;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CanonicalisationError,
  ObjectTooLargeError,
  buildLinkDraft,
  canonicaliseLink,
  ensureNameIndexDocShape,
  ensureNamespaceChunkShape,
  ensureProfileShape,
  fetchIpfsJson,
  insertIntoHead,
  loadIndex,
  loadProfileOrInit,
  rebaseAndSaveProfile,
  saveHeadAndIndex
});
//# sourceMappingURL=index.cjs.map