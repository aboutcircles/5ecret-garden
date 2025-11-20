<script lang="ts">
  import { get } from 'svelte/store';
  import { popupControls } from '$lib/stores/popUp';
  import { runTask } from '$lib/utils/tasks';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet.svelte';

  import { createProfilesOffersClient } from '$lib/offers/client';
  import ProductGallery from '$lib/components/ProductGallery.svelte';


  // read-only Safe calls (owners / threshold only)
  import { Contract, JsonRpcProvider } from 'ethers';

  // EIP-712 SafeMessage signer via MetaMask
  import { createMetaMaskSafeSigner } from '$lib/safeSigner/signers/metamask';
  import type {Address} from "@circles-sdk/utils";
  import type {OfferFlowContext} from "$lib/flows/offer/types";

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  const CHAIN_ID_NUM = 100;   // Gnosis
  const CHAIN_ID_HEX = '0x64';

  function requiredOk(): boolean {
    const hasOperator =
      typeof context.operator === 'string' &&
      /^0x[a-f0-9]{40}$/.test(context.operator.toLowerCase());

    const d = context.draft!;
    const hasProduct = !!d?.sku && !!d?.name;
    const hasOffer =
      (d?.price ?? 0) > 0 &&
      /^[A-Z]{3}$/.test(d?.priceCurrency ?? '') &&
      isAbsUrl(d?.checkout ?? '');

    return hasOperator && hasProduct && hasOffer;
  }

  function isAbsUrl(s?: string): boolean {
    // Only treat http(s) as acceptable absolute URLs for product.image
    // (data:, ipfs:, etc. should be handled explicitly elsewhere)
    if (!s) return false;
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isDataUrl(s?: string): boolean {
    if (!s) return false;
    return /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)?(;charset=[^;]+)?;base64,/.test(s);
  }

  function parseDataUrl(dataUrl: string): { mime: string | null; bytes: Uint8Array } {
    // Expected: data:[<mediatype>][;charset=<charset>][;base64],<data>
    const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;]+)?;base64,(.*)$/);
    if (!match) throw new Error('Unsupported data URL format');
    const mime = match[1] || null;
    const b64 = match[2];
    // atob polyfill safe way
    const binary = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return { mime, bytes };
  }

  // Get all images (prioritizing multiple images, falling back to single image)
  function getAllImages(): Array<string | { url: string }> {
    const draft = context.draft;
    
    // If we have multiple images, return them in the expected format
    if (draft?.images && Array.isArray(draft.images) && draft.images.length > 0) {
      return draft.images.map(url => ({ url }));
    }
    
    // Fall back to single image
    if (draft?.image) {
      return [{ url: draft.image }];
    }
    
    // No images available
    return [];
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Chain helpers
  // ──────────────────────────────────────────────────────────────────────────────
  async function ensureGnosisChain(): Promise<void> {
    const eth: any = (window as any)?.ethereum;
    if (!eth) throw new Error('No injected provider');

    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: 'Gnosis Chain',
            nativeCurrency: { name: 'xDAI', symbol: 'XDAI', decimals: 18 },
            rpcUrls: ['https://rpc.gnosis.gateway.fm', 'https://rpc.gnosischain.com'],
            blockExplorerUrls: ['https://gnosisscan.io']
          }]
        });
      } else {
        throw e;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SAFE helpers (owners + threshold only, no fallback handler call)
  // ──────────────────────────────────────────────────────────────────────────────
  const SAFE_VIEW_ABI = [
    'function getOwners() view returns (address[])',
    'function getThreshold() view returns (uint256)',
  ];

  async function getSafeInfo(safe: Address): Promise<{ owners: Address[]; threshold: number }> {
    const provider = new JsonRpcProvider('https://rpc.aboutcircles.com');
    const contract = new Contract(safe, SAFE_VIEW_ABI, provider);

    const owners = (await (contract.getOwners() as Promise<string[]>)).map(
      (o) => o.toLowerCase() as Address
    );
    const thresholdRaw = await (contract.getThreshold() as Promise<bigint | number>);
    const threshold = typeof thresholdRaw === 'bigint' ? Number(thresholdRaw) : thresholdRaw;

    return { owners, threshold };
  }

  function ownersPreview(owners: string[], max: number = 3): string {
    if (owners.length <= max) return owners.join(', ');
    return `${owners.slice(0, max).join(', ')}, …(+${owners.length - max})`;
  }

  async function resolveOwnerAndAssertSafe(safe: Address): Promise<{ owner: Address }> {
    await ensureGnosisChain();

    const eth: any = (window as any)?.ethereum;
    if (!eth?.request) throw new Error('No injected provider');

    const accs: string[] = await eth.request({ method: 'eth_requestAccounts' }) as string[];
    const owner = (accs?.[0] ?? '').toLowerCase() as Address;
    if (!/^0x[a-f0-9]{40}$/.test(owner)) throw new Error('No EOA account unlocked in wallet');
    if (owner === safe.toLowerCase()) throw new Error('Selected account equals the Safe. Switch to a Safe owner EOA.');

    const info = await getSafeInfo(safe);

    if (info.threshold !== 1) {
      throw new Error(`Safe threshold must be 1 for this flow (current: ${info.threshold}).`);
    }

    const belongs = new Set(info.owners).has(owner);
    if (!belongs) {
      const preview = ownersPreview(info.owners);
      throw new Error(`Connected account ${owner} is not an owner of Safe ${safe}. Owners: ${preview}`);
    }

    return { owner };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Circles bindings
  // ──────────────────────────────────────────────────────────────────────────────
  function mkCirclesBindings() {
    const circlesVal = get(circles);
    const hasCircles = !!circlesVal;
    if (!hasCircles) throw new Error('Circles SDK not initialized');
    if (!circlesVal.profiles) throw new Error('Profiles service not configured');

    const pinBase = (context.pinApiBase ?? '').replace(/\/$/, '');
    const pinUrl = pinBase ? `${pinBase}/api/pin` : '';
    const pinMediaUrl = pinBase ? `${pinBase}/api/pin-media` : '';
    const canonicalizeUrl = pinBase ? `${pinBase}/api/canonicalize` : '';

    async function pinViaMarketApi(obj: any): Promise<string> {
      if (!pinUrl) throw new Error('pinApiBase not provided; cannot call /api/pin');

      const res = await fetch(pinUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/ld+json; charset=utf-8', 'Accept': 'application/ld+json' },
        body: JSON.stringify(obj)
      });

      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch { /* ignore */ }
        throw new Error(`Pin API error ${res.status}: ${detail || res.statusText}`);
      }

      const body = await res.json().catch(() => ({} as any));
      const cid = body?.cid;
      const looksCidV0 = typeof cid === 'string' && /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
      if (!looksCidV0) throw new Error(`Pin API returned invalid cid: ${String(cid)}`);
      return cid;
    }

    async function pinMediaBytes(bytes: Uint8Array, mime?: string | null): Promise<string> {
      if (!pinMediaUrl) throw new Error('pinApiBase not provided; cannot call /api/pin-media');
      // 8 MiB cap mirrored on client to avoid 413
      const MAX = 8 * 1024 * 1024;
      if (bytes.length > MAX) {
        throw new Error('Image too large: exceeds 8 MiB upload limit. Please upload a smaller image.');
      }
      const res = await fetch(pinMediaUrl, {
        method: 'POST',
        headers: { 'Content-Type': (mime || 'application/octet-stream'), 'Accept': 'application/json' },
        body: bytes
      });
      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch { /* ignore */ }
        throw new Error(`Pin API error ${res.status}: ${detail || res.statusText}`);
      }
      const body = await res.json().catch(() => ({} as any));
      const cid = body?.cid;
      const looksCidV0 = typeof cid === 'string' && /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
      if (!looksCidV0) throw new Error(`Pin API returned invalid cid: ${String(cid)}`);
      return cid;
    }

    function gatewayUrlForCid(cid: string): string {
      // Use public IPFS gateway per requirement
      return `https://ipfs.io/ipfs/${cid}`;
    }

    return {
      getLatestProfileCid: async (avatar: Address) =>
        (await circlesVal.data.getMetadataCidForAddress(avatar)) ?? null,
      getProfile: async (cid: string) => {
        try { return await circlesVal.profiles!.get(cid); } catch { return undefined; }
      },
      putJsonLd: async (obj: any) => pinViaMarketApi(obj),
      pinMediaBytes,
      gatewayUrlForCid,
      updateAvatarProfileDigest: async (avatar: Address, cid: string) => {
        const av = await circlesVal.getAvatar(avatar);
        const tx = await av.updateMetadata(cid);
        return (tx as any)?.hash ?? undefined;
      },
      canonicalizeJsonLd: async (obj: any) => {
        if (!canonicalizeUrl) throw new Error('pinApiBase not provided; cannot call /api/canonicalize');
        const res = await fetch(canonicalizeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/ld+json; charset=utf-8', 'Accept': 'text/plain' },
          body: JSON.stringify(obj)
        });
        if (!res.ok) {
          let detail = '';
          try { detail = await res.text(); } catch { /* ignore */ }
          throw new Error(`Canonicalize API error ${res.status}: ${detail || res.statusText}`);
        }
        return await res.text();
      }
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Publish
  // ──────────────────────────────────────────────────────────────────────────────
  async function publish(): Promise<void> {
    if (!requiredOk()) throw new Error('Draft has missing or invalid fields.');

    const draft = context.draft!;

    const walletVal = get(wallet);
    const sellerAddress = walletVal?.address as Address | undefined;
    const hasSellerAddress = typeof sellerAddress === 'string' && sellerAddress.length === 42;
    if (!hasSellerAddress) {
      throw new Error('Wallet avatar address is required to publish an offer.');
    }

    const seller = sellerAddress;

    await ensureGnosisChain();
    const { owner } = await resolveOwnerAndAssertSafe(seller);

    const circlesBindings = mkCirclesBindings();
    const eth: any = (window as any)?.ethereum;

    // EIP-712 ONLY: MetaMask typed-data signer
    const safeSigner = createMetaMaskSafeSigner({
      ethereum: eth,
      account: owner,
      chainId: BigInt(CHAIN_ID_NUM),
      safeAddress: seller,
      enforceChainId: true
    });

    const client = createProfilesOffersClient(circlesBindings as any, safeSigner as any);

    const hasImagesArray = Array.isArray(draft.images) && draft.images.length > 0;
    const hasLegacyImage = typeof draft.image === 'string' && draft.image.length > 0;
    const productImages = hasImagesArray ? draft.images : (hasLegacyImage ? [draft.image] : undefined);

    await runTask({
      name: 'Publishing offer…',
      promise: (async () => {
        // Pre-pin images: convert any data: URLs to gateway URLs via /api/pin-media
        let finalImageUrls: string[] | undefined = undefined;
        if (Array.isArray(productImages) && productImages.length > 0) {
          const imgs = productImages as string[];
          const toCidUrl = async (img: string): Promise<string> => {
            // Already absolute URL? keep
            if (isAbsUrl(img)) return img;
            // ipfs://CID
            if (typeof img === 'string' && img.startsWith('ipfs://')) {
              const cid = img.slice('ipfs://'.length);
              return circlesBindings.gatewayUrlForCid(cid);
            }
            // Bare CID (Qm...)
            if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(img)) {
              return circlesBindings.gatewayUrlForCid(img);
            }
            // data: URL -> pin-media
            if (isDataUrl(img)) {
              const { mime, bytes } = parseDataUrl(img);
              const cid = await circlesBindings.pinMediaBytes(bytes, mime);
              return circlesBindings.gatewayUrlForCid(cid);
            }
            // Fallback: treat as URL if parsable, else error
            if (isAbsUrl(img)) return img;
            throw new Error('Unsupported image format. Please provide an http(s) URL or upload an image.');
          };
          finalImageUrls = await Promise.all(imgs.map(toCidUrl));
        }

        const res = await client.appendOffer({
          avatar: seller,
          operator: context.operator,
          chainId: CHAIN_ID_NUM,
          product: {
            sku: draft.sku,
            name: draft.name,
            description: draft.description || undefined,
            image: finalImageUrls,
            url: draft.url || undefined,
            brand: draft.brand || undefined,
            mpn: draft.mpn || undefined,
            gtin13: draft.gtin13 || undefined,
            category: draft.category || undefined
          },
          offer: {
            price: Number(draft.price),
            priceCurrency: draft.priceCurrency!,
            checkout: draft.checkout!,
            availability: draft.availability || undefined,
            availabilityFeed: draft.availabilityFeed || undefined,
            inventoryFeed: draft.inventoryFeed || undefined,
            url: draft.url || undefined,
            sellerName: draft.sellerName || undefined
          },
        });
        context.result = res;
      })()
    });

    popupControls.close();
  }
</script>

{#if !requiredOk()}
    <div class="alert alert-warning mb-4">Draft has missing or invalid fields.</div>
{/if}

<div class="space-y-2">
    <div class="text-sm opacity-70">Review</div>
    <div class="bg-base-100 border rounded-lg p-3">
        <div class="font-semibold truncate">
            {context.draft?.name}
            <span class="opacity-60">({context.draft?.sku})</span>
        </div>

        <!-- Show product gallery if images exist -->
        {#if getAllImages().length > 0}
          <ProductGallery images={getAllImages()} />
        {:else if context.draft?.image}
            <!-- Fallback to single image for legacy support -->
            <img alt="preview" class="w-full h-40 object-cover rounded mt-2" src={context.draft?.image}/>
        {/if}

        {#if context.draft?.description}
            <div class="mt-2 text-sm opacity-80">{context.draft?.description}</div>
        {/if}

        <div class="mt-3 text-sm">
            <div><strong>Price:</strong> {context.draft?.price} {context.draft?.priceCurrency}</div>
            <div class="truncate"><strong>Checkout:</strong> {context.draft?.checkout}</div>
        </div>
    </div>

    <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn" onclick={() => history.back()}>Back</button>
        <button type="button" class="btn btn-primary" disabled={!requiredOk()} onclick={publish}>Publish</button>
    </div>
</div>
