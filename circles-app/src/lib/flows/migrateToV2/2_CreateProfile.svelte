<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import type { MigrateToV2Context } from '$lib/flows/migrateToV2/context';
  import MigrateContacts from './3_MigrateContacts.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import {
    FallbackImageUrl,
    getProfile,
    profilesEqual,
  } from '$lib/utils/profile';
  import { popupControls } from '$lib/stores/popUp';
  import type { Profile } from '@circles-sdk/profiles';

  interface Props {
    context: MigrateToV2Context;
  }

  let { context = $bindable() }: Props = $props();

  let errors: string[] | undefined = $state(undefined);

  const config = {
    maxImageSizeKB: parseInt('150'),
    descriptionLength: parseInt('500'),
    imageUrlLength: parseInt('2000'),
    maxNameLength: parseInt('36'),
  };

  let newProfile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: '',
  });

  $effect(() => {
    if (avatarState.profile) {
      newProfile = avatarState.profile;
    }
  });

  onMount(async () => {
    if (!avatarState.avatar?.address) {
      throw new Error('Avatar store not initialized');
    }
    context.profile = avatarState.profile;
  });

  const validateProfile = async (profile: Profile) => {
    const errors: string[] = [];

    if (!profile.name || typeof profile.name !== 'string' || profile.name.length > config.maxNameLength) {
      errors.push(`Name is required and must be a string with a maximum length of ${config.maxNameLength} characters.`);
    }

    if (profile.description && (typeof profile.description !== 'string' || profile.description.length > config.descriptionLength)) {
      errors.push(`Description must be a string and cannot exceed ${config.descriptionLength} characters.`);
    }

    if (profile.previewImageUrl) {
      const isValidImage = await validateImage(profile.previewImageUrl);
      if (!isValidImage) {
        errors.push(`Invalid preview image data URL, or size exceeds ${config.maxImageSizeKB}KB.`);
      }
    }

    if (profile.imageUrl && (typeof profile.imageUrl !== 'string' || profile.imageUrl.length > config.imageUrlLength)) {
      errors.push(`Image URL must be a string and cannot exceed ${config.imageUrlLength} characters.`);
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
    if (!profilesEqual(context.profile, newProfile)) {
      errors = await validateProfile(newProfile);
      if (errors.length > 0) {
        return;
      }
      context.profile = newProfile;
    }

    if (
      context.profile?.previewImageUrl &&
      Object.values(FallbackImageUrl).includes(
        context.profile.previewImageUrl as FallbackImageUrl
      )
    ) {
      context.profile.previewImageUrl = undefined;
    }

    popupControls.open({
      title: 'Migrate Contacts',
      component: MigrateContacts,
      props: { context },
    });
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Profile</p>
  <p class="text-base-content/70 mt-2">
    Create a profile for your new Circles v2 avatar.
  </p>

  {#if errors && errors.length > 0}
    <div class="alert alert-error mt-6">
      <span class="font-bold">Error</span>
      <ul class="list-disc ml-4">
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <ProfileEditor bind:profile={newProfile} />

  <div class="flex justify-end space-x-2 mt-6">
    <button type="submit" class="btn btn-primary text-white" onclick={() => next()}>
      Next
    </button>
  </div>
</FlowDecoration>
