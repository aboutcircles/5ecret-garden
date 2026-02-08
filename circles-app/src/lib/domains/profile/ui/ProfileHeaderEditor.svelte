<!-- src/lib/profile/ProfileHeaderEditor.svelte -->
<script lang="ts">
    import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';
    import {
        fileToCroppedDataUrl,
        AVATAR_PREFERRED_MAX_BYTES,
        MEDIA_MAX_BYTES,
    } from '$lib/shared/media/imageTools';

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
    }

    let {
        name = $bindable(''),
        description = $bindable(''),
        location = $bindable(''),
        previewImageUrl = $bindable(''),
        imageUrl = $bindable(''),
        readonly = false,
        showLocation = true,
        nameLabel = 'Name',
        onNameInput,
    }: Props = $props();

    const CROP_WIDTH = 256;
    const CROP_HEIGHT = 256;

    let safeName = $derived((name ?? '').trim() || 'Unnamed profile');

    function initialsFromName(value: string): string {
        const parts = value.split(/\s+/).filter((p) => p.length > 0);
        const head = parts.slice(0, 2);
        const chars = head.map((p) => (p[0] ? p[0].toUpperCase() : ''));
        const joined = chars.join('').trim();
        return joined || '?';
    }

    let initials = $derived(initialsFromName(safeName));

    let fileInput: HTMLInputElement | undefined = $state();

    function handleAvatarClick(): void {
        if (readonly) return;
        if (!fileInput) {
            return;
        }
        fileInput.value = '';
        fileInput.click();
    }

    function handleFileInput(event: Event): void {
        if (readonly) return;
        const input = event.target as HTMLInputElement | null;
        const files = input?.files;
        if (!files || files.length === 0) {
            return;
        }
        const file = files[0];
        void createImagePreview(file);
    }

    function handleDragOver(event: DragEvent): void {
        if (readonly) return;
        event.preventDefault();
        event.stopPropagation();
    }

    function handleDrop(event: DragEvent): void {
        if (readonly) return;
        event.preventDefault();
        event.stopPropagation();

        const dt = event.dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) {
            return;
        }
        const file = dt.files[0];
        void createImagePreview(file);
    }

    async function createImagePreview(file: File): Promise<void> {
        if (readonly) return;

        try {
            const { dataUrl, bytes } = await fileToCroppedDataUrl(file, {
                width: CROP_WIDTH,
                height: CROP_HEIGHT,
                mime: 'image/jpeg',
                quality: 0.85,
                maxBytes: MEDIA_MAX_BYTES,
            });

            if (bytes.length > AVATAR_PREFERRED_MAX_BYTES) {
                console.warn('Avatar image data URL exceeds ~150 KB');
            }

            previewImageUrl = dataUrl;
            if (!imageUrl) {
                imageUrl = dataUrl;
            }
        } catch (e) {
            console.error('[profile-avatar] failed to create image preview:', e);
        }
    }

    function clearPicture(): void {
        if (readonly) return;
        previewImageUrl = '';
    }
</script>

<div class="space-y-3">
    <div class="flex items-center gap-3">
        <div class="flex flex-col items-center gap-1">
            <button
                type="button"
                class="avatar placeholder"
                class:cursor-pointer={!readonly}
                title={readonly ? 'Avatar' : 'Change avatar'}
                aria-label={readonly ? 'Avatar' : 'Change avatar'}
                onclick={handleAvatarClick}
                ondragover={handleDragOver}
                ondrop={handleDrop}
                disabled={readonly}
            >
                <div class="w-16 h-16 rounded-full bg-base-200">
                    {#if previewImageUrl}
                        <img src={previewImageUrl} alt={`${safeName} avatar preview`} />
                    {:else}
                        <span class="text-xl">{initials}</span>
                    {/if}
                </div>
            </button>

            {#if previewImageUrl}
                <button
                    class="btn btn-ghost btn-xs px-1 min-h-0 h-auto"
                    onclick={clearPicture}
                    disabled={readonly}
                >
                    Remove picture
                </button>
            {/if}
        </div>

        <div class="flex-1 space-y-2">
            <label class="form-control">
                <span class="label-text text-xs">{nameLabel}</span>
                <input
                    class="input input-sm input-bordered"
                    bind:value={name}
                    placeholder="Your profile name"
                    readonly={readonly}
                    oninput={(event) => onNameInput?.((event.currentTarget as HTMLInputElement).value)}
                />
            </label>
            {#if showLocation}
                <label class="form-control">
                    <span class="label-text text-xs">Location</span>
                    <input
                        class="input input-sm input-bordered"
                        bind:value={location}
                        placeholder="City, Country"
                        readonly={readonly}
                    />
                </label>
            {/if}
        </div>
    </div>

    <label class="form-control">
        <span class="label-text text-xs">Description</span>
        <MarkdownEditor
            bind:value={description}
            rows={3}
            placeholder="Short profile description"
            readonly={readonly}
            editorClass="textarea textarea-bordered textarea-sm w-full"
        />
    </label>

    <!-- Hidden file input for avatar upload -->
    <input
        type="file"
        accept="image/*"
        bind:this={fileInput}
        class="hidden"
        onchange={handleFileInput}
    />
</div>

<style>
    img { object-fit: cover; width: 100%; height: 100%; }
</style>
