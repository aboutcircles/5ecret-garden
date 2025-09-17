<script lang="ts">
    import SettingProfile from '$lib/pages/SettingProfile.svelte';
    import { settings } from '$lib/stores/settings.svelte';
    import { popupControls } from '$lib/stores/popUp';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import Send from '$lib/flows/send/1_To.svelte';
    import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';

    interface Props {
        text?: string | undefined;
        address?: string | undefined;
        logo?: string | undefined;
        homeLink?: string; // kept for API compatibility
        menuItems?: { name: string; link: string }[]; // kept for compatibility
        quickAction?: any; // kept for compatibility
        route?: string | null; // kept for compatibility
    }

    let {
        text = undefined,
        address = undefined,
        logo = undefined,
        homeLink = '/',
        menuItems = [],
        quickAction = undefined,
        route = null
    }: Props = $props();

    function openSwitchProfile() {
        popupControls.open({ title: '', component: SettingProfile, props: { address } });
    }

    const canSend = $derived(!!avatarState.avatar && !avatarState.isGroup);
    const canAddContact = $derived(!!avatarState.avatar);
</script>

<!-- Overlay-only avatar button; no full-width navbar, no reserved height -->
<div class="fixed top-3 right-3 z-30">
    <div class="">
        <button role="button" aria-label="Open user menu" class="btn btn-ghost btn-circle" onclick={openSwitchProfile}>
            <div class="avatar">
                <div class="w-9 rounded-full ring ring-base-300">
                    <img src={logo || '/person.svg'} alt="Avatar" />
                </div>
            </div>
        </button>
    </div>
</div>
