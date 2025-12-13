// src/http.ts
var HttpError = class extends Error {
  constructor(status, statusText, body) {
    super(`HTTP ${status} ${statusText}: ${body}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
};
var FetchHttpTransport = class {
  async request(opts) {
    const headers = {
      Accept: "application/json, application/ld+json",
      ...opts.headers
    };
    let body = void 0;
    if (opts.body !== void 0) {
      if (typeof opts.body === "string" || typeof Blob !== "undefined" && opts.body instanceof Blob) {
        body = opts.body;
      } else if (headers["Content-Type"]?.includes("application/x-www-form-urlencoded")) {
        body = opts.body;
      } else {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        body = JSON.stringify(opts.body);
      }
    }
    const res = await fetch(opts.url, {
      method: opts.method,
      headers,
      body,
      signal: opts.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpError(res.status, res.statusText, text);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.toLowerCase().includes("json")) {
      return await res.json();
    }
    return await res.text();
  }
};

// src/authContext.ts
var InMemoryAuthContext = class {
  constructor() {
    this.token = null;
    this.exp = null;
    // epoch seconds
    this.meta = null;
    this.expiryGraceSeconds = 15;
  }
  // small grace to avoid edge expiry
  getToken() {
    if (!this.token || !this.exp) return null;
    const now = Math.floor(Date.now() / 1e3);
    if (now >= this.exp - this.expiryGraceSeconds) {
      return null;
    }
    return this.token;
  }
  setToken(token, expSeconds, addr, chainId) {
    this.token = token;
    this.exp = Math.floor(Date.now() / 1e3) + expSeconds;
    this.meta = { address: addr.toLowerCase(), chainId };
  }
  clear() {
    this.token = null;
    this.exp = null;
    this.meta = null;
  }
  getMeta() {
    return this.getToken() ? this.meta : null;
  }
};

// src/auth.ts
var AuthClientImpl = class {
  constructor(marketApiBase, http, authContext, signers) {
    this.marketApiBase = marketApiBase;
    this.http = http;
    this.authContext = authContext;
    this.signers = signers;
  }
  async signInWithAvatar(options) {
    const chainId = options.chainId ?? 100;
    const ch = await this.http.request({
      method: "POST",
      url: `${this.marketApiBase}/api/auth/challenge`,
      body: { address: options.avatar, chainId }
    });
    const msgBytes = new TextEncoder().encode(ch.message);
    const safeSigner = await this.signers.createSafeSignerForAvatar({
      avatar: options.avatar,
      ethereum: options.ethereum,
      chainId: BigInt(chainId),
      enforceChainId: true
    });
    const signature = await safeSigner.signBytes(msgBytes);
    const verify = await this.http.request({
      method: "POST",
      url: `${this.marketApiBase}/api/auth/verify`,
      body: { challengeId: ch.challengeId, signature }
    });
    this.authContext.setToken(verify.token, verify.expiresIn, verify.address, verify.chainId);
    return { address: verify.address, chainId: verify.chainId };
  }
  signOut() {
    this.authContext.clear();
  }
  getAuthMeta() {
    return this.authContext.getMeta();
  }
};

// src/utils.ts
function isAbsoluteUri(u) {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return !!url.protocol && !!url.hostname;
  } catch {
    return false;
  }
}
function normalizeEvmAddress(v) {
  if (typeof v !== "string") throw new Error(`Invalid address: ${String(v)}`);
  const s = v.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(s)) throw new Error(`Invalid address: ${v}`);
  return s;
}
function isEvmAddress(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}
function isValidSku(sku) {
  return /^[a-z0-9][a-z0-9-_]{0,62}$/.test(sku);
}
function assertSku(sku) {
  if (!isValidSku(sku)) throw new Error("Invalid SKU");
}

// src/signers.ts
var SignersClientImpl = class {
  async createSafeSignerForAvatar(opts) {
    const avatar = normalizeEvmAddress(opts.avatar);
    const chainId = opts.chainId;
    if (opts.enforceChainId) {
      const reported = await opts.ethereum.request({ method: "eth_chainId" });
      const reportedNum = BigInt(reported);
      if (reportedNum !== chainId) {
        throw new Error(`Wrong chain. Expected ${chainId} got ${reported}`);
      }
    }
    const accounts = await opts.ethereum.request({ method: "eth_requestAccounts", params: [] });
    if (!accounts || accounts.length === 0) {
      throw new Error("No EOA account unlocked in wallet");
    }
    const owner = normalizeEvmAddress(accounts[0]);
    const signer = {
      avatar,
      chainId,
      signBytes: async (payload) => {
        const typedData = buildSafeMessageTypedData(avatar, chainId, payload);
        const sig = await opts.ethereum.request({
          method: "eth_signTypedData_v4",
          params: [owner, JSON.stringify(typedData)]
        });
        return sig;
      }
    };
    return signer;
  }
};
function toHex(bytes) {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function buildSafeMessageTypedData(avatar, chainId, payload) {
  return {
    domain: {
      chainId: Number(chainId),
      verifyingContract: avatar
    },
    primaryType: "SafeMessage",
    types: {
      EIP712Domain: [
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ],
      SafeMessage: [{ name: "message", type: "bytes" }]
    },
    message: {
      message: toHex(payload)
    }
  };
}

// src/orders.ts
var OrdersClientImpl = class {
  constructor(marketApiBase, http, authContext) {
    this.marketApiBase = marketApiBase;
    this.http = http;
    this.authContext = authContext;
  }
  async list(opts) {
    const token = this.requireToken();
    const params = new URLSearchParams();
    if (opts?.page !== void 0) params.set("page", String(opts.page));
    if (opts?.pageSize !== void 0) params.set("pageSize", String(opts.pageSize));
    const res = await this.http.request({
      method: "GET",
      url: `${this.marketApiBase}/api/cart/v1/orders/by-buyer?${params.toString()}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(res.items) ? res.items : [];
  }
  async getById(orderId) {
    const token = this.requireToken();
    try {
      return await this.http.request({
        method: "GET",
        url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}`,
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        return null;
      }
      throw e;
    }
  }
  async getStatusHistory(orderId) {
    const token = this.requireToken();
    return await this.http.request({
      method: "GET",
      url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}/status-history`,
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  subscribeStatusEvents(onEvent) {
    const token = this.requireToken();
    const controller = new AbortController();
    const url = `${this.marketApiBase}/api/cart/v1/orders/events`;
    fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream"
      },
      signal: controller.signal
    }).then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`SSE failed: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const evt = parseSseEvent(chunk);
          if (evt && (evt.event === "order-status" || evt.event === void 0)) {
            try {
              const data = JSON.parse(evt.data || "{}");
              onEvent(data);
            } catch {
            }
          }
        }
      }
    }).catch(() => {
    });
    return () => controller.abort();
  }
  onOrderDelivered(handler) {
    const ORDER_DELIVERED = "https://schema.org/OrderDelivered";
    const PAYMENT_COMPLETE = "https://schema.org/PaymentComplete";
    return this.subscribeStatusEvents(async (evt) => {
      const interesting = evt.newStatus === ORDER_DELIVERED || evt.newStatus === PAYMENT_COMPLETE;
      if (!interesting) return;
      const snap = await this.getById(evt.orderId);
      if (snap) handler(snap);
    });
  }
  requireToken() {
    const token = this.authContext.getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  }
};
function parseSseEvent(chunk) {
  const lines = chunk.split(/\r?\n/);
  let event;
  const dataParts = [];
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
  }
  if (dataParts.length === 0 && !event) return null;
  return { event, data: dataParts.join("\n") };
}

// src/cart.ts
var CartClientImpl = class {
  constructor(marketApiBase, http, authContext) {
    this.marketApiBase = marketApiBase;
    this.http = http;
    this.authContext = authContext;
  }
  maybeAuthHeaders() {
    const token = this.authContext.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  async createBasket(opts) {
    const body = {
      buyer: opts.buyer,
      operator: opts.operator,
      chainId: opts.chainId ?? 100
    };
    const res = await this.http.request({
      method: "POST",
      url: `${this.marketApiBase}/api/cart/v1/baskets`,
      headers: { ...this.maybeAuthHeaders() },
      body
    });
    return res;
  }
  async setItems(opts) {
    const items = opts.items.map((i) => ({
      seller: i.seller,
      orderedItem: { "@type": "Product", sku: i.sku },
      orderQuantity: i.quantity,
      imageUrl: i.imageUrl
    }));
    return await this.http.request({
      method: "PATCH",
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}`,
      headers: { ...this.maybeAuthHeaders() },
      body: { items }
    });
  }
  async setCheckoutDetails(opts) {
    const body = {};
    if (opts.shippingAddress) body.shippingAddress = toPostal(opts.shippingAddress);
    if (opts.billingAddress) body.billingAddress = toPostal(opts.billingAddress);
    if (opts.contactPoint) body.contactPoint = toContact(opts.contactPoint);
    if (opts.ageProof) body.ageProof = toPerson(opts.ageProof);
    return await this.http.request({
      method: "PATCH",
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}`,
      headers: { ...this.maybeAuthHeaders() },
      body
    });
  }
  async validateBasket(basketId) {
    return await this.http.request({
      method: "POST",
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/validate`,
      headers: { ...this.maybeAuthHeaders() }
    });
  }
  async previewOrder(basketId) {
    return await this.http.request({
      method: "POST",
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/preview`,
      headers: { ...this.maybeAuthHeaders() }
    });
  }
  async checkoutBasket(opts) {
    return await this.http.request({
      method: "POST",
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}/checkout`,
      headers: { ...this.maybeAuthHeaders() },
      body: opts.buyer ? { buyer: opts.buyer } : void 0
    });
  }
};
function toPostal(a) {
  return {
    "@type": "PostalAddress",
    ...a
  };
}
function toContact(c) {
  return {
    "@type": "ContactPoint",
    ...c
  };
}
function toPerson(p) {
  return {
    "@type": "Person",
    ...p
  };
}

// src/offersJsonld.ts
var CurrencyCodeError = class extends Error {
};
var ObjectTooLargeError = class extends Error {
};
var UrlValidationError = class extends Error {
};
var CONTEXT = [
  "https://schema.org/",
  "https://aboutcircles.com/contexts/circles-market/"
];
function normalizeImages(img) {
  if (img == null) return void 0;
  const out = [];
  const pushStr = (s) => {
    if (!isAbsoluteUri(s)) throw new UrlValidationError("image must be absolute URL");
    out.push(s);
  };
  const pushObj = (o) => {
    const obj = { "@type": "ImageObject" };
    if (o.contentUrl != null) {
      if (!isAbsoluteUri(o.contentUrl)) throw new UrlValidationError("image.contentUrl must be absolute URL");
      obj.contentUrl = o.contentUrl;
    }
    if (o.url != null) {
      if (!isAbsoluteUri(o.url)) throw new UrlValidationError("image.url must be absolute URL");
      obj.url = o.url;
    }
    out.push(obj);
  };
  if (typeof img === "string") {
    pushStr(img);
  } else if (Array.isArray(img)) {
    for (const it of img) {
      if (typeof it === "string") pushStr(it);
      else if (it && typeof it === "object") pushObj(it);
      else throw new UrlValidationError("Invalid image element");
    }
  } else if (typeof img === "object") {
    pushObj(img);
  } else {
    throw new UrlValidationError("Invalid image");
  }
  return out;
}
function enforceSizeCap(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  const cap = 8 * 1024 * 1024;
  if (bytes.length > cap) throw new ObjectTooLargeError("JSON-LD exceeds 8 MiB cap");
}
function buildProduct(product, offer) {
  if (typeof offer.price !== "number" || !(offer.price > 0)) {
    throw new Error("offer.price must be > 0");
  }
  if (typeof offer.priceCurrency !== "string" || !/^[A-Z]{3}$/.test(offer.priceCurrency)) {
    throw new CurrencyCodeError("priceCurrency must be 3 upper-case letters");
  }
  if (offer.availabilityFeed && !isAbsoluteUri(offer.availabilityFeed)) throw new UrlValidationError("availabilityFeed must be absolute URL");
  if (offer.inventoryFeed && !isAbsoluteUri(offer.inventoryFeed)) throw new UrlValidationError("inventoryFeed must be absolute URL");
  if (offer.fulfillmentEndpoint && !isAbsoluteUri(offer.fulfillmentEndpoint)) throw new UrlValidationError("fulfillmentEndpoint must be absolute URL");
  if (offer.url && !isAbsoluteUri(offer.url)) throw new UrlValidationError("offer.url must be absolute URL");
  if (product.url && !isAbsoluteUri(product.url)) throw new UrlValidationError("product.url must be absolute URL");
  const imageArr = normalizeImages(product.image);
  const offerObj = {
    "@type": "Offer",
    price: offer.price,
    priceCurrency: offer.priceCurrency
  };
  if (offer.availabilityFeed) offerObj.availabilityFeed = offer.availabilityFeed;
  if (offer.inventoryFeed) offerObj.inventoryFeed = offer.inventoryFeed;
  if (offer.url) offerObj.url = offer.url;
  if (offer.availableDeliveryMethod) offerObj.availableDeliveryMethod = offer.availableDeliveryMethod;
  if (offer.requiredSlots) offerObj.requiredSlots = offer.requiredSlots;
  if (offer.fulfillmentEndpoint) offerObj.fulfillmentEndpoint = offer.fulfillmentEndpoint;
  if (offer.fulfillmentTrigger) offerObj.fulfillmentTrigger = offer.fulfillmentTrigger;
  const obj = {
    "@context": [...CONTEXT],
    "@type": "Product",
    sku: product.sku,
    name: product.name,
    offers: [offerObj]
  };
  if (product.description) obj.description = product.description;
  if (imageArr && imageArr.length) obj.image = imageArr;
  if (product.url) obj.url = product.url;
  if (product.brand) obj.brand = product.brand;
  if (product.mpn) obj.mpn = product.mpn;
  if (product.gtin13) obj.gtin13 = product.gtin13;
  if (product.category) obj.category = product.category;
  enforceSizeCap(obj);
  return obj;
}

// ../circles-profile-core/src/namespaces.ts
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
    if (!replaced && typeof l?.name === "string" && l.name.toLowerCase() === nameLc) {
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

// ../circles-profile-core/src/canonicalise.ts
var CanonicalisationError = class extends Error {
};
var ObjectTooLargeError2 = class extends Error {
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
function toHex2(bytes) {
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
  if (bytes.length > cap) throw new ObjectTooLargeError2("Link preimage exceeds 8 MiB");
  return bytes;
}
async function buildLinkDraft(args) {
  const now = args.nowSec ?? Math.floor(Date.now() / 1e3);
  const nonceBytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) {
    for (let i = 0; i < nonceBytes.length; i++) nonceBytes[i] = Math.floor(Math.random() * 256);
  } else {
    globalThis.crypto.getRandomValues(nonceBytes);
  }
  const nonce = toHex2(nonceBytes);
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

// src/offers.ts
var OffersClientImpl = class {
  constructor(bindings) {
    this.bindings = bindings;
  }
  ensureBindings() {
    if (!this.bindings) {
      throw new Error("OffersClient requires profilesBindings to be provided to CirclesClient.");
    }
    return this.bindings;
  }
  async publishOffer(opts) {
    const b = this.ensureBindings();
    const chainId = opts.chainId ?? 100;
    const avatar = normalizeEvmAddress(opts.avatar);
    const operator = normalizeEvmAddress(opts.operator);
    const gateway = opts.paymentGateway ? normalizeEvmAddress(opts.paymentGateway) : void 0;
    assertSku(opts.product.sku);
    const productObj = buildProduct(opts.product, opts.offer);
    const offerArray = Array.isArray(productObj.offers) ? productObj.offers : [];
    const offer0 = offerArray[0];
    if (offer0) {
      const payTo = gateway ?? avatar;
      offer0.potentialAction = {
        "@type": "PayAction",
        price: offer0.price,
        priceCurrency: offer0.priceCurrency,
        recipient: { "@id": `eip155:${chainId}:${payTo}` },
        instrument: {
          "@type": "PropertyValue",
          propertyID: "eip155",
          value: `${chainId}:${payTo}`,
          name: "pay-to"
        }
      };
    }
    const productCid = await b.putJsonLd(productObj);
    const link = await buildLinkDraft({
      name: `product/${opts.product.sku}`,
      cid: productCid,
      chainId,
      signerAddress: avatar
    });
    const preimage = canonicaliseLink(link);
    const signature = await opts.signer.signBytes(preimage);
    link.signature = signature;
    const { profile } = await loadProfileOrInit(b, avatar);
    const currentIndexCid = profile.namespaces?.[operator] ?? null;
    const { index, head } = await loadIndex(b, currentIndexCid);
    const { rotated, closedHead } = insertIntoHead(head, link);
    const { headCid, indexCid } = await saveHeadAndIndex(b, head, index, closedHead);
    const profileCid = await rebaseAndSaveProfile(b, avatar, (prof) => {
      prof.namespaces[operator] = indexCid;
    });
    const txHash = await b.updateAvatarProfileDigest(avatar, profileCid);
    let linkCid;
    try {
      linkCid = await b.putJsonLd(link);
    } catch {
    }
    return { productCid, headCid, indexCid, profileCid, linkCid, txHash: txHash || void 0 };
  }
  async tombstone(opts) {
    const b = this.ensureBindings();
    const chainId = opts.chainId ?? 100;
    const avatar = normalizeEvmAddress(opts.avatar);
    const operator = normalizeEvmAddress(opts.operator);
    assertSku(opts.sku);
    const nowSec = Math.floor(Date.now() / 1e3);
    const tomb = {
      "@context": "https://aboutcircles.com/contexts/circles-market/",
      "@type": "Tombstone",
      sku: opts.sku,
      at: nowSec
    };
    const payloadCid = await b.putJsonLd(tomb);
    const link = await buildLinkDraft({
      name: `product/${opts.sku}`,
      cid: payloadCid,
      chainId,
      signerAddress: avatar
    });
    const preimage = canonicaliseLink(link);
    const signature = await opts.signer.signBytes(preimage);
    link.signature = signature;
    const { profile } = await loadProfileOrInit(b, avatar);
    const currentIndexCid = profile.namespaces?.[operator] ?? null;
    const { index, head } = await loadIndex(b, currentIndexCid);
    const { rotated, closedHead } = insertIntoHead(head, link);
    const { headCid, indexCid } = await saveHeadAndIndex(b, head, index, closedHead);
    const profileCid = await rebaseAndSaveProfile(b, avatar, (prof) => {
      prof.namespaces[operator] = indexCid;
    });
    const txHash = await b.updateAvatarProfileDigest(avatar, profileCid);
    let linkCid;
    try {
      linkCid = await b.putJsonLd(link);
    } catch {
    }
    return { headCid, indexCid, profileCid, linkCid, txHash: txHash || void 0 };
  }
};

// src/CirclesClient.ts
var CirclesClient = class {
  constructor(opts) {
    this.marketApiBase = opts.marketApiBase.replace(/\/$/, "");
    this.http = opts.http ?? new FetchHttpTransport();
    this.authContext = opts.authContext ?? new InMemoryAuthContext();
    this.signers = new SignersClientImpl();
    this.auth = new AuthClientImpl(this.marketApiBase, this.http, this.authContext, this.signers);
    this.orders = new OrdersClientImpl(this.marketApiBase, this.http, this.authContext);
    this.cart = new CartClientImpl(this.marketApiBase, this.http, this.authContext);
    this.offers = opts.profilesBindings ? new OffersClientImpl(opts.profilesBindings) : void 0;
  }
};
export {
  AuthClientImpl,
  CanonicalisationError,
  CartClientImpl,
  CirclesClient,
  CurrencyCodeError,
  FetchHttpTransport,
  HttpError,
  InMemoryAuthContext,
  ObjectTooLargeError,
  OffersClientImpl,
  OrdersClientImpl,
  SignersClientImpl,
  UrlValidationError,
  assertSku,
  buildLinkDraft,
  buildProduct,
  canonicaliseLink,
  ensureNameIndexDocShape,
  ensureNamespaceChunkShape,
  ensureProfileShape,
  fetchIpfsJson,
  insertIntoHead,
  isAbsoluteUri,
  isEvmAddress,
  isValidSku,
  loadIndex,
  loadProfileOrInit,
  normalizeEvmAddress,
  rebaseAndSaveProfile,
  saveHeadAndIndex
};
//# sourceMappingURL=index.js.map