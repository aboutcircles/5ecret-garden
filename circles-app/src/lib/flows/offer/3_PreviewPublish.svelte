<script lang="ts">
    import {get} from 'svelte/store';
    import {popupControls} from '$lib/stores/popUp';
    import {runTask} from '$lib/utils/tasks';
    import {circles} from '$lib/stores/circles';
    import {signer, wallet} from '$lib/stores/wallet.svelte';
    import {createProfilesOffersClient} from '$lib/offers/client';
    import {computeSafeHash} from '$lib/offers/adapters';
    import type {OfferFlowContext, Address} from './types';
    import {getSigner, signer as signerStore} from '$lib/stores/wallet.svelte';
    import {SigningKey, Signature} from 'ethers';

    interface Props {
        context: OfferFlowContext;
    }

    let {context}: Props = $props();

    const circlesVal = get(circles);
    const walletVal = get(wallet);
    const signerVal = signer;

    /**
     * Sign a 32-byte digest with the injected wallet.
     * 1) try eth_sign
     * 2) if not available, try personal_sign (MetaMask param order)
     * 3) fall back to swapped personal_sign (some wallets)
     */
    async function signWithProviderEOA(addr: Address, digest32: `0x${string}`): Promise<`0x${string}`> {
        const eth: any = (window as any)?.ethereum;
        if (!eth?.request) {
            throw new Error('No injected provider available for signing');
        }

        try {
            // Preferred (raw digest signature; some wallets disable it)
            return await eth.request({method: 'eth_sign', params: [addr, digest32]});
        } catch (e: any) {
            const msg = String(e?.message ?? '');
            const code = e?.code;
            const methodUnavailable =
                code === -32601 ||
                /method .*eth_sign.* does not exist|not available/i.test(msg);

            if (!methodUnavailable) {
                throw e; // different error (user reject etc.) -> bubble up
            }

            // Fallback 1: MetaMask personal_sign (data first, then address)
            try {
                return await eth.request({method: 'personal_sign', params: [digest32, addr]});
            } catch (e2: any) {
                // Fallback 2: some wallets use reversed order
                try {
                    return await eth.request({method: 'personal_sign', params: [addr, digest32]});
                } catch (e3) {
                    throw e3; // give up
                }
            }
        }
    }

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
        try {
            new URL(s);
            return true;
        } catch {
            return false;
        }
    }

    // Minimal inline bindings to reuse existing client
    function mkClient() {
        if (!circlesVal) throw new Error('Circles SDK not initialized');
        if (!circlesVal.profiles) throw new Error('Profiles service not configured');
        if (!walletVal?.address) throw new Error('Wallet runner not available');

        // ----- Pin endpoint wiring -----
        const pinBase = (context.pinApiBase ?? '').replace(/\/$/, '');
        const pinUrl  = pinBase ? `${pinBase}/api/pin` : '';

        async function pinViaMarketApi(obj: any): Promise<string> {
            if (!pinUrl) {
                throw new Error('pinApiBase not provided; cannot call /api/pin');
            }
            const res = await fetch(pinUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ld+json; charset=utf-8',
                    'Accept': 'application/ld+json'
                },
                body: JSON.stringify(obj)
            });

            if (!res.ok) {
                let detail = '';
                try { detail = await res.text(); } catch {}
                throw new Error(`Pin API error ${res.status}: ${detail || res.statusText}`);
            }

            const body = await res.json().catch(() => ({} as any));
            const cid = body?.cid;
            const looksCidV0 = typeof cid === 'string' && /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
            if (!looksCidV0) {
                throw new Error(`Pin API returned invalid cid: ${String(cid)}`);
            }
            return cid;
        }

        // ----- CirclesBindings -----
        const circlesBindings = {
            // Read latest profile CID for avatar
            getLatestProfileCid: async (avatar: Address) =>
                (await circlesVal.data.getMetadataCidForAddress(avatar)) ?? null,

            // Read arbitrary JSON-LD by CID (reuse profiles reader)
            getProfile: async (cid: string) => {
                try { return await circlesVal.profiles!.get(cid); } catch { return undefined; }
            },

            // IMPORTANT: write via market /api/pin
            putJsonLd: async (obj: any) => {
                return await pinViaMarketApi(obj);
            },

            // Publish digest on-chain (unchanged)
            updateAvatarProfileDigest: async (avatar: Address, cid: string) => {
                const av = await circlesVal.getAvatar(avatar);
                const tx = await av.updateMetadata(cid);
                return (tx as any)?.hash ?? undefined;
            }
        };

        // ----- Signing (EOA / Safe owner) -----

        async function signDigest(d: `0x${string}`): Promise<`0x${string}`> {
            // local PK path (works for circles "circles" / PK sessions)
            if (signerVal.privateKey) {
                const key = new SigningKey(signerVal.privateKey as `0x${string}`);
                return Signature.from(key.sign(d)).serialized as `0x${string}`;
            }

            // Ensure we actually know the owner EOA (browser sessions)
            if (!signerVal.address) {
                try {
                    const addr = await getSigner();
                    if (addr) {
                        signerStore.address = addr;
                        signerVal.address = addr as Address;
                    }
                } catch {
                    /* ignore; handled below */
                }
            }
            if (!signerVal.address) {
                // last resort: request accounts
                const eth: any = (window as any)?.ethereum;
                const accs: string[] | undefined = await eth?.request?.({method: 'eth_requestAccounts'});
                const addr = (accs?.[0] ?? '').toLowerCase();
                if (addr && /^0x[a-f0-9]{40}$/.test(addr)) {
                    signerStore.address = addr as Address;
                    signerVal.address = addr as Address;
                }
            }
            if (!signerVal.address) {
                throw new Error('Owner EOA address missing');
            }

            // Provider path with fallbacks
            return await signWithProviderEOA(signerVal.address as Address, d);
        }

        const isSafe = Boolean(
            walletVal.address &&
            signerVal.address &&
            walletVal.address.toLowerCase() !== (signerVal.address as string).toLowerCase()
        );

        const signerBindings = {
            signKeccakDigest: async (_addr: Address, digest32: `0x${string}`) => signDigest(digest32),
            signSafeHash: async (safe: Address, owner: Address, chainId: bigint, payload: Uint8Array) => {
                const digest = computeSafeHash(chainId, safe, payload);
                return signDigest(digest);
            },
            _isSafeRunner: isSafe,
            _ownerAddress: signerVal.address as Address | undefined
        };

        const client = createProfilesOffersClient(
            circlesBindings as any,
            signerBindings as any
        );

        return {client, isSafe, owner: signerBindings._ownerAddress};
    }

    async function publish(): Promise<void> {
        if (!requiredOk()) throw new Error('Draft has missing or invalid fields.');
        const {client, isSafe, owner} = mkClient();
        const d = context.draft!;
        const seller = walletVal!.address as Address;

        const CHAIN_ID = 100; // GNOSIS

        await runTask({
            name: 'Publishing offer…',
            promise: (async () => {
                const res = await client.appendOffer({
                    avatar: seller,
                    operator: context.operator,
                    chainId: CHAIN_ID,
                    product: {
                        sku: d.sku,
                        name: d.name,
                        description: d.description || undefined,
                        image: d.image || undefined,
                        url: d.url || undefined,
                        brand: d.brand || undefined,
                        mpn: d.mpn || undefined,
                        gtin13: d.gtin13 || undefined,
                        category: d.category || undefined,
                    },
                    offer: {
                        price: Number(d.price),
                        priceCurrency: d.priceCurrency!,
                        checkout: d.checkout!,
                        availability: d.availability || undefined,
                        availabilityFeed: d.availabilityFeed || undefined,
                        inventoryFeed: d.inventoryFeed || undefined,
                        url: d.url || undefined,
                        sellerName: d.sellerName || undefined,
                    },
                    ownerAddress: isSafe ? (owner as Address) : undefined,
                });

                context.result = res;
            })(),
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
        <div class="font-semibold truncate">{context.draft?.name} <span class="opacity-60">({context.draft?.sku})</span>
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
