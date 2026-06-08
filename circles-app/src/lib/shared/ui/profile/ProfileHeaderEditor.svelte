<!-- src/lib/profile/ProfileHeaderEditor.svelte -->
<script lang="ts">
    import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';
    import {
        fileToCroppedDataUrl,
    } from '$lib/shared/media/imageTools';
    import {
        PROFILE_IMAGE_CROP_HEIGHT,
        PROFILE_IMAGE_CROP_WIDTH,
        PROFILE_IMAGE_MAX_BYTES,
        PROFILE_IMAGE_OUTPUT_MIME,
        PROFILE_IMAGE_OUTPUT_QUALITY,
    } from './profileImagePolicy';
    import { T } from '$lib/design-system/tokens.js';

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
    }: Props = $props();

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
            const { dataUrl } = await fileToCroppedDataUrl(file, {
                width: PROFILE_IMAGE_CROP_WIDTH,
                height: PROFILE_IMAGE_CROP_HEIGHT,
                mime: PROFILE_IMAGE_OUTPUT_MIME,
                quality: PROFILE_IMAGE_OUTPUT_QUALITY,
                maxBytes: PROFILE_IMAGE_MAX_BYTES,
            });

            previewImageUrl = dataUrl;
        } catch (e) {
            console.error('[profile-avatar] failed to create image preview:', e);
        }
    }

    function clearPicture(): void {
        if (readonly) return;
        previewImageUrl = '';
    }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
    <div style="display:flex;align-items:flex-start;gap:14px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;">
            <button
                type="button"
                title={readonly ? 'Avatar' : 'Change avatar'}
                aria-label={readonly ? 'Avatar' : 'Change avatar'}
                onclick={handleAvatarClick}
                ondragover={handleDragOver}
                ondrop={handleDrop}
                disabled={readonly}
                style="
                    width:64px;height:64px;border-radius:9999px;border:1px solid {T.hairlineSoft};
                    background:{T.surfaceAlt};color:{T.inkMuted};
                    display:inline-flex;align-items:center;justify-content:center;overflow:hidden;
                    cursor:{readonly ? 'default' : 'pointer'};padding:0;
                    font-family:{T.fontDisplay};font-size:22px;
                "
            >
                {#if previewImageUrl}
                    <img src={previewImageUrl} alt={`${safeName} avatar preview`} />
                {:else}
                    {initials}
                {/if}
            </button>

            {#if previewImageUrl}
                <button
                    type="button"
                    style="height:24px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11px;cursor:{readonly ? 'not-allowed' : 'pointer'};"
                    onclick={clearPicture}
                    disabled={readonly}
                >Remove</button>
            {/if}
        </div>

        <div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0;">
            <label style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">{nameLabel}</span>
                <input
                    style="width:100%;padding:9px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                    bind:value={name}
                    placeholder="Your profile name"
                    readonly={readonly}
                    data-popup-initial-input={nameInputDataAttribute === 'data-popup-initial-input' ? true : undefined}
                    oninput={(event) => onNameInput?.((event.currentTarget as HTMLInputElement).value)}
                />
            </label>
            {#if showLocation}
                <label style="display:flex;flex-direction:column;gap:4px;">
                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Location</span>
                    <input
                        style="width:100%;padding:9px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                        bind:value={location}
                        placeholder="City, Country"
                        readonly={readonly}
                    />
                </label>
            {/if}
        </div>
    </div>

    <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Description</span>
        <MarkdownEditor
            bind:value={description}
            rows={3}
            placeholder="Short profile description"
            readonly={readonly}
            editorClass="profile-description-editor"
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
    :global(.profile-description-editor) {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid rgba(31,17,70,0.08);
        border-radius: 10px;
        font-family: "Inter Tight", "Inter", -apple-system, system-ui, sans-serif;
        font-size: 13px;
        color: #0F0A1E;
        background: #FFFFFF;
        box-sizing: border-box;
        min-height: 72px;
        resize: vertical;
    }
</style>
