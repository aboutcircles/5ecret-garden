<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { ProfileFormStep } from '$lib/shared/ui/profile';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import MigrateContacts from './3_MigrateContacts.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import {
    FallbackImageUrl,
    profilesEqual,
  } from '$lib/shared/utils/profile';
  import { openStep } from '$lib/shared/flow/runtime';
  import type { Profile } from '@circles-sdk/profiles';
  import { requireAvatar } from '$lib/shared/flow/guards';
  import type { ProfileEditStepProps } from '$lib/shared/flow/contracts';

  type Props = ProfileEditStepProps<MigrateToV2Context>;

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
    requireAvatar(avatarState.avatar);
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

  import { parseDataUrlToBytes } from '$lib/shared/media/imageTools';

  const validateImage = async (dataUrl: string): Promise<boolean> => {
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/;
    if (!dataUrlPattern.test(dataUrl)) {
      console.error('Invalid data URL pattern', dataUrl);
      return false;
    }

    try {
      const { bytes } = parseDataUrlToBytes(dataUrl);
      if (bytes.length > config.maxImageSizeKB * 1024) {
        console.error('Image size exceeds limit');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to parse image data URL', e);
      return false;
    }
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

    openStep({
      title: 'Migrate Contacts',
      component: MigrateContacts,
      props: { context },
    });
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
  <FlowStepHeader
    step={2}
    total={4}
    title="Profile"
    subtitle="Create your Circles V2 profile details."
    labels={['Invitation', 'Profile', 'Contacts', 'Migrate']}
  />

  <p class="text-base-content/70 mt-2">
    Create a profile for your new Circles v2 avatar.
  </p>

  {#if errors && errors.length > 0}
    <StepAlert variant="error" title="Profile validation error" className="mt-6">
      <ul class="list-disc ml-4">
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </StepAlert>
  {/if}

  <ProfileFormStep
    bind:name={newProfile.name}
    bind:description={newProfile.description}
    bind:previewImageUrl={newProfile.previewImageUrl}
    bind:imageUrl={newProfile.imageUrl}
    submitLabel="Continue"
    onSubmit={next}
    submitContainerClass="flex justify-end w-full mt-2"
  />
  </div>
</FlowDecoration>
