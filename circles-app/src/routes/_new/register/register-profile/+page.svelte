<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {circles} from "$lib/stores/circles";
    import type {Profile} from "@circles-sdk/profiles";
    import ProfileEditor from "$lib/components/ProfileEditor.svelte";

    let profile: Profile = {
        name: "",
        description: "",
        previewImageUrl: "",
        imageUrl: undefined,
    };

    async function registerProfile() {
        await $circles?.createOrUpdateProfile(profile);
    }
</script>

<div class="hero">
    <div class="hero-content flex-col lg:flex-row-reverse">

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <img src="/person.svg"
                     alt="person"
                     class="w-16 h-16 rounded-xl"/>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Register profile</h2>
                <ProfileEditor bind:profile={profile} />
                <div class="card-actions">
                    <ActionButton action={registerProfile}
                                  disabled={profile.name.trim().length < 1}>
                        Create
                    </ActionButton>
                </div>
            </div>
        </div>
    </div>
</div>