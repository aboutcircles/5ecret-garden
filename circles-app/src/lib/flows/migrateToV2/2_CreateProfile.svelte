<script lang="ts">
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import type { MigrateToV2Context } from '$lib/flows/migrateToV2/context';
  import MigrateContacts from './3_MigrateContacts.svelte';
  import { onMount } from 'svelte';
  import { avatar } from '$lib/stores/avatar';
  import { getProfile } from '$lib/utils/profile';

  export let contentApi: PopupContentApi;
  export let context: MigrateToV2Context;

  let errors: string[] | undefined = undefined;

  const config = {
    maxImageSizeKB: parseInt('150'),
    descriptionLength: parseInt('500'),
    imageUrlLength: parseInt('2000'),
    maxNameLength: parseInt('36'),
  };

  const convertUrlToDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  onMount(async () => {
    if (!$avatar?.address) {
      throw new Error('Avatar store not initialized');
    }
    const currentProfile = await getProfile($avatar.address);

    let previewImageUrl = currentProfile.previewImageUrl ?? '';

    if (!previewImageUrl.startsWith('data:image')) {
      previewImageUrl = await convertUrlToDataUrl(previewImageUrl);
    }
    context.profile = {
      name: currentProfile.name ?? '',
      description: currentProfile.description ?? '',
      previewImageUrl,
    };
  });

  const validateProfile = async (profile: any) => {
    const errors: string[] = [];

    if (
      !profile.name ||
      typeof profile.name !== 'string' ||
      profile.name.length > config.maxNameLength
    ) {
      errors.push(
        `Name is required and must be a string with a maximum length of ${config.maxNameLength} characters.`
      );
    }

    if (
      profile.description &&
      (typeof profile.description !== 'string' ||
        profile.description.length > config.descriptionLength)
    ) {
      errors.push(
        `Description must be a string and cannot exceed ${config.descriptionLength} characters.`
      );
    }

    if (profile.previewImageUrl) {
      const isValidImage = await validateImage(profile.previewImageUrl);
      if (!isValidImage) {
        errors.push(
          `Invalid preview image data URL, or size exceeds ${config.maxImageSizeKB}KB.`
        );
      }
    }

    if (
      profile.imageUrl &&
      (typeof profile.imageUrl !== 'string' ||
        profile.imageUrl.length > config.imageUrlLength)
    ) {
      errors.push(
        `Image URL must be a string and cannot exceed ${config.imageUrlLength} characters.`
      );
    }

    return errors;
  };

  const validateImage = async (dataUrl: string): Promise<boolean> => {
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/;
    if (!dataUrlPattern.test(dataUrl)) {
      console.error('Invalid data URL pattern', dataUrl);
      return false;
    }

    const base64Data = dataUrl.replace(dataUrlPattern, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > config.maxImageSizeKB * 1024) {
      console.error('Image size exceeds limit');
      return false;
    }

    return true;
  };

  async function next() {
    errors = await validateProfile(context.profile);
    if (errors.length > 0) {
      return;
    }

    contentApi.open({
      title: 'Migrate Contacts',
      component: MigrateContacts,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold mt-14">Profile</p>
  <p class="text-gray-500 mt-2">
    Create a profile for your new Circles v2 avatar.
  </p>
  <!-- list of errors (if errors.length > 0) -->
  {#if errors && errors.length > 0}
    <div
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6"
      role="alert"
    >
      <strong class="font-bold">Error</strong>
      <ul class="list-disc list-inside">
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
  <ProfileEditor bind:profile={context.profile} />
  <div class="flex justify-end space-x-2 mt-6">
    <button
      type="submit"
      class="btn btn-primary text-white"
      on:click={() => next()}
    >
      Next
    </button>
  </div>
</FlowDecoration>
