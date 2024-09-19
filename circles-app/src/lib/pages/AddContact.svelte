<script lang="ts">
    import {ethers} from "ethers6";
    import {createEventDispatcher, onMount} from "svelte";
    import {type AvatarRow, CirclesQuery} from "@circles-sdk/data";
    import {circles} from "$lib/stores/circles";
    import {createCirclesQueryStore} from "$lib/stores/query/circlesQueryStore";
    import type {Readable} from "svelte/store";
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import Trust from "$lib/pages/Trust.svelte";
    import GenericList from "$lib/components/GenericList.svelte";
    import AvatarRowView from "$lib/components/AvatarRow.svelte";

    export let contentApi: PopupContentApi;
    export let selectedAddress: string | undefined = undefined;

    let input: HTMLInputElement | undefined;
    let editorText: string | undefined = undefined;

    let store: Readable<{ data: AvatarRow[], next: () => Promise<boolean>, ended: boolean }> | undefined = undefined;

    onMount(async () => {
        if (selectedAddress && input) {
            editorText = selectedAddress;
            input.value = editorText;
        }
        store = await createStore();
    })

    const handleInput = async (e: any) => {
        editorText = (e.target as HTMLInputElement).value;
        if (ethers.isAddress(editorText)) {
            selectedAddress = editorText;
        }
        console.log("Input", editorText);
        store = await createStore();
    };

    async function createQuery(): Promise<CirclesQuery<AvatarRow>> {
        if (!$circles) {
            throw new Error("Circles not loaded")
        }
        return new CirclesQuery($circles.circlesRpc, {
            namespace: "V_Crc",
            table: "Avatars",
            columns: [],
            filter: [{
                Type: "Conjunction",
                ConjunctionType: "Or",
                Predicates: [{
                    Type: "FilterPredicate",
                    FilterType: "Like",
                    Column: "avatar",
                    Value: (editorText?.toLowerCase() ?? "") + "%"
                }, {
                    Type: "FilterPredicate",
                    FilterType: "ILike",
                    Column: "name",
                    Value: (editorText ?? "") + "%"
                }]
            }],
            sortOrder: "ASC",
            limit: 25
        });
    }

    function createStore() {
        return createCirclesQueryStore<AvatarRow>(createQuery);
    }

    async function selected(address: string) {
        if (!$circles) {
            throw new Error("Circles not loaded")
        }
        const avatarInfo = await $circles.data.getAvatarInfo(address);
        if (!avatarInfo) {
            // Not a Circles user. Invite to Circles
        } else {
            // Trust
            contentApi.open({
                title: "Trust",
                component: Trust,
                props: {
                    address: address
                }
            });
        }

    }
</script>

<div class="form-control my-4">
    <input bind:this={input}
           type="text"
           class="input input-bordered"
           placeholder="Enter or search Ethereum address"
           on:input={handleInput}
    />
</div>

<div class="mt-4">
    <p class="menu-title pl-0">
        Found avatars
    </p>
    <GenericList store={store} row={AvatarRowView}/>
</div>
