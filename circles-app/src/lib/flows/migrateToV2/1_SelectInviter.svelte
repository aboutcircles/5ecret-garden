<script lang="ts">
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import type { MigrateToV2Context } from '$lib/flows/migrateToV2/context';
  import CreateProfile from './2_CreateProfile.svelte';
  import { onMount } from 'svelte';
  import { getProfile } from '$lib/components/Avatar.svelte';
  import { avatar } from '$lib/stores/avatar';

  export let contentApi: PopupContentApi;
  export let context: MigrateToV2Context;

  let errors: string[] | undefined = undefined;

  const config = {
    maxImageSizeKB: parseInt('150'),
    descriptionLength: parseInt('500'),
    imageUrlLength: parseInt('2000'),
    maxNameLength: parseInt('36'),
  };

  onMount(async () => {
    if (!$avatar?.address) {
      throw new Error('Avatar store not initialized');
    }
    const currentProfile = await getProfile($avatar.address);
    context.profile = {
      name: currentProfile.name ?? '',
      description: currentProfile.description ?? '',
      previewImageUrl: currentProfile.previewImageUrl ?? '',
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
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif);base64,/;
    if (!dataUrlPattern.test(dataUrl)) {
      console.error('Invalid data URL pattern');
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
      title: 'Create Profile',
      component: CreateProfile,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold mt-14">Inviter</p>
  <p class="text-gray-500 mt-2">
    Select an inviter in order to join Circles v2.
  </p>
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
