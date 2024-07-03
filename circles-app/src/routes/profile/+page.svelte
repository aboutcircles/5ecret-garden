<script lang="ts" context="module">
    export async function createProfile(profile: any): Promise<string> {
        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(profile),
            });

            if (!response.ok) {
                throw new Error('Failed to create profile');
            }

            const data = await response.json();
            return data.cid;
        } catch (error) {
            throw new Error(`Error creating profile: ${(error as Error).message}`);
        }
    }

    export async function updateProfile(profile: any): Promise<string> {
        return createProfile(profile);
    }

    export async function retrieveProfile(cid: string): Promise<any> {
        try {
            const response = await fetch(`/api/profile?cid=${cid}`);
            if (!response.ok) {
                throw new Error('Failed to retrieve profile');
            }

            const profileData = await response.json();
            return profileData;
        } catch (error) {
            throw new Error(`Error retrieving profile: ${(error as Error).message}`);
        }
    }
</script>

<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";

    let name = "";
    let description = "";
    let image = "";
    let email = "";
    let twitter = "";
    let linkedin = "";
    let cid = "";

    const profile = () => ({
        name,
        description,
        image,
        email,
        social: {twitter, linkedin}
    });

    async function createOrUpdateProfile(action: 'create' | 'update') {
        try {
            const profileCid = await createProfile(profile());
            cid = profileCid;
            alert(`Profile ${action}d with CID: ${profileCid}`);
        } catch (error) {
            console.error(`Error ${action}ing profile:`, error);
            alert(`Failed to ${action} profile`);
        }
    }

    async function retrieveProfileData() {
        try {
            const profileData = await retrieveProfile(cid);
            name = profileData.name;
            description = profileData.description;
            image = profileData.image;
            email = profileData.email;
            twitter = profileData.social.twitter;
            linkedin = profileData.social.linkedin;
            alert('Profile retrieved successfully');
        } catch (error) {
            console.error('Error retrieving profile:', error);
            alert('Failed to retrieve profile');
        }
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Personal Profile</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                <input bind:value={name} type="text" id="name"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Name">
            </div>
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea bind:value={description} id="description"
                          class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                          placeholder="Description"></textarea>
            </div>
            <div>
                <label for="image" class="block text-sm font-medium text-gray-700">Image URL</label>
                <input bind:value={image} type="text" id="image"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="https://example.com/image.png">
            </div>
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                <input bind:value={email} type="email" id="email"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="email@example.com">
            </div>
            <div>
                <label for="twitter" class="block text-sm font-medium text-gray-700">Twitter</label>
                <input bind:value={twitter} type="text" id="twitter"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="@twitter">
            </div>
            <div>
                <label for="linkedin" class="block text-sm font-medium text-gray-700">LinkedIn</label>
                <input bind:value={linkedin} type="text" id="linkedin"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="LinkedIn profile URL">
            </div>
            <div>
                <label for="cid" class="block text-sm font-medium text-gray-700">CID</label>
                <input bind:value={cid} type="text" id="cid"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Qm...">
            </div>
            <ActionButton action={() => createOrUpdateProfile('create')}
                          disabled={!name || !description || !image || !email}>Create Profile
            </ActionButton>
            <ActionButton action={() => createOrUpdateProfile('update')}
                          disabled={!name || !description || !image || !email}>Update Profile
            </ActionButton>
            <ActionButton action={retrieveProfileData} disabled={!cid}>Retrieve Profile</ActionButton>
        </div>
    </div>
</div>
