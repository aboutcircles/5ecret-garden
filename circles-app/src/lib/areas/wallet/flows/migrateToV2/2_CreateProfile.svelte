<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { MIGRATE_FLOW_SCAFFOLD_BASE } from './constants';
  import { ProfileFormStep } from '$lib/shared/ui/profile';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import MigrateContacts from './3_MigrateContacts.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import {
    FallbackImageUrl,
    profilesEqual,
  } from '$lib/shared/utils/profile';
  import { openStep } from '$lib/shared/flow';
  import type { Profile } from '@circles-sdk/profiles';
  import { requireAvatar } from '$lib/shared/flow';
  import type { ProfileEditStepProps } from '$lib/shared/flow';
  import { validateProfile } from '$lib/shared/ui/profile/profileValidation';

  type Props = ProfileEditStepProps<MigrateToV2Context>;

  let { context = $bindable() }: Props = $props();

  let errors: string[] | undefined = $state(undefined);

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
<FlowStepScaffold
  {...MIGRATE_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Create profile"
  subtitle="Create your Circles V2 profile details."
>

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
  </FlowStepScaffold>

