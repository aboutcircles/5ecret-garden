<script lang="ts">
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import ProfileHeaderEditor from './ProfileHeaderEditor.svelte';

  interface Props {
    name: string;
    description?: string;
    location?: string;
    previewImageUrl?: string;
    imageUrl?: string;
    readonly?: boolean;
    showLocation?: boolean;
    nameLabel?: string;
    onNameInput?: (value: string) => void;
    nameInputDataAttribute?: string;
    showSubmit?: boolean;
    submitLabel?: string;
    submitDisabled?: boolean;
    onSubmit?: () => void | Promise<void>;
    submitContainerClass?: string;
  }

  let {
    name = $bindable(''),
    description = $bindable(''),
    location = $bindable(''),
    previewImageUrl = $bindable(''),
    imageUrl = $bindable<string | undefined>(),
    readonly = false,
    showLocation = true,
    nameLabel = 'Name',
    onNameInput,
    nameInputDataAttribute,
    showSubmit = true,
    submitLabel = 'Create',
    submitDisabled,
    onSubmit,
    submitContainerClass = 'mx-auto',
  }: Props = $props();

  const isSubmitDisabled = $derived(
    submitDisabled ?? name.trim().length < 1
  );
</script>

<div class="w-full flex flex-col gap-y-4">
  <ProfileHeaderEditor
    bind:name
    bind:description
    bind:location
    bind:previewImageUrl
    bind:imageUrl
    {readonly}
    {showLocation}
    {nameLabel}
    {onNameInput}
    {nameInputDataAttribute}
  />
  {#if showSubmit}
    <div class={submitContainerClass}>
      <ActionButton action={onSubmit ?? (async () => {})} disabled={isSubmitDisabled}>
        {submitLabel}
      </ActionButton>
    </div>
  {/if}
</div>
