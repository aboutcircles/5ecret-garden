<script lang="ts">
  import { get } from 'svelte/store';
  import { popupControls } from '$lib/stores/popUp';
  import { runTask } from '$lib/utils/tasks';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet.svelte';

  import { createProfilesOffersClient } from '$lib/offers/client';
  import type { OfferFlowContext, Address } from './types';

  // read-only Safe calls (owners / threshold only)
  import { Contract, JsonRpcProvider } from 'ethers';

  // EIP-712 SafeMessage signer via MetaMask
  import { createMetaMaskSafeSigner } from '$lib/safeSigner/signers/metamask';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  const circlesVal = get(circles);
  const walletVal = get(wallet);

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
    if (!s) return false;
    try { new URL(s); return true; } catch { return false; }
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
    if (!circlesVal) throw new Error('Circles SDK not initialized');
    if (!circlesVal.profiles) throw new Error('Profiles service not configured');

    const pinBase = (context.pinApiBase ?? '').replace(/\/$/, '');
    const pinUrl = pinBase ? `${pinBase}/api/pin` : '';
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

    return {
      getLatestProfileCid: async (avatar: Address) =>
        (await circlesVal.data.getMetadataCidForAddress(avatar)) ?? null,
      getProfile: async (cid: string) => {
        try { return await circlesVal.profiles!.get(cid); } catch { return undefined; }
      },
      putJsonLd: async (obj: any) => pinViaMarketApi(obj),
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

    const d = context.draft!;
    const seller = (walletVal!.address as Address); // Safe (avatar) address

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

    await runTask({
      name: 'Publishing offer…',
      promise: (async () => {
        const res = await client.appendOffer({
          avatar: seller,
          operator: context.operator,
          chainId: CHAIN_ID_NUM,
          product: {
            sku: d.sku,
            name: d.name,
            description: d.description || undefined,
            image: d.image || undefined,
            url: d.url || undefined,
            brand: d.brand || undefined,
            mpn: d.mpn || undefined,
            gtin13: d.gtin13 || undefined,
            category: d.category || undefined
          },
          offer: {
            price: Number(d.price),
            priceCurrency: d.priceCurrency!,
            checkout: d.checkout!,
            availability: d.availability || undefined,
            availabilityFeed: d.availabilityFeed || undefined,
            inventoryFeed: d.inventoryFeed || undefined,
            url: d.url || undefined,
            sellerName: d.sellerName || undefined
          },
          // debugSaveLinkObject: true,
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

        {#if context.draft?.image}
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
