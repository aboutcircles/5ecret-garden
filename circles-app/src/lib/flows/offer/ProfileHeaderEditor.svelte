<!-- src/lib/flows/offer/ProfileHeaderEditor.svelte -->
<script lang="ts">
    import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';
    import {
        fileToCroppedDataUrl,
        AVATAR_PREFERRED_MAX_BYTES,
        MEDIA_MAX_BYTES,
    } from '$lib/media/imageTools';

    interface Props {
        name: string;
        description?: string;
        location?: string;
        previewImageUrl?: string;
        imageUrl?: string;
        readonly?: boolean;
    }

    let {
        name = $bindable(''),
        description = $bindable(''),
        location = $bindable(''),
        previewImageUrl = $bindable(''),
        imageUrl = $bindable(''),
        readonly = false,
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

<section aria-label="Profile header">
    <div class="card bg-transparent border-0 shadow-none">
        <div class="card-body gap-4 p-0">
            <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <!-- Avatar: click / drop to change -->
                <div class="flex flex-col items-center gap-2">
                    <button
                        type="button"
                        class="relative rounded-full focus:outline-none focus-visible:ring focus-visible:ring-primary/60"
                        onclick={handleAvatarClick}
                        ondragover={handleDragOver}
                        ondrop={handleDrop}
                        aria-label={readonly ? 'Profile photo' : 'Change profile photo'}
                        title={readonly ? 'Profile photo' : 'Change profile photo'}
                    >
                        <div
                            class="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring ring-base-200 ring-offset-2 ring-offset-base-100 bg-base-200 flex items-center justify-center text-base-content/70 text-2xl font-semibold"
                        >
                            {#if previewImageUrl}
                                <img
                                        src={previewImageUrl}
                                        alt={safeName}
                                        class="w-full h-full object-cover"
                                />
                            {:else}
                                {initials}
                            {/if}
                        </div>

                        {#if !readonly}
                            <!-- Subtle floating camera button, like social media UIs -->
                            <span
                                class="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-base-100 shadow ring-1 ring-base-300 hover:bg-base-200 transition"
                                aria-hidden="true"
                            >
                                <!-- simple camera icon (no external dep) -->
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/80">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </span>
                        {/if}

                        <input
                                bind:this={fileInput}
                                type="file"
                                accept="image/*"
                                class="hidden"
                                onchange={handleFileInput}
                        />
                    </button>
                    {#if previewImageUrl && !readonly}
                        <div class="flex items-center gap-2 text-[11px] opacity-70">
                            <button
                                type="button"
                                class="link link-error text-[11px]"
                                onclick={clearPicture}
                            >
                                Clear
                            </button>
                        </div>
                    {/if}
                </div>

                <!-- Editable text fields -->
                <div class="flex-1 min-w-0 space-y-4">
                    <!-- Name -->
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[11px] uppercase tracking-wide text-base-content/60">
                                Display name
                            </span>
                            <span class="text-[11px] text-base-content/40">
                                Shown to other people
                            </span>
                        </div>
                        <input
                                class="w-full bg-transparent border-none text-2xl md:text-3xl font-semibold tracking-tight p-0 focus:outline-none focus:ring-0"
                                bind:value={name}
                                placeholder="Add a name"
                                disabled={readonly}
                        />
                    </div>

                    <!-- Location -->
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[11px] uppercase tracking-wide text-base-content/60">
                                Location
                            </span>
                            <span class="text-[11px] text-base-content/40">
                                Optional · City, region or community
                            </span>
                        </div>
                        <input
                                class="w-full bg-transparent border-none text-sm text-base-content/80 p-0 focus:outline-none focus:ring-0"
                                bind:value={location}
                                placeholder="Where are you based?"
                                disabled={readonly}
                        />
                    </div>

                    <!-- Bio -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[11px] uppercase tracking-wide text-base-content/60">
                                Bio
                            </span>
                            <span class="text-[11px] text-base-content/40">
                                Optional
                            </span>
                        </div>
                        <MarkdownEditor
                                bind:value={description}
                                rows={3}
                                placeholder="Tell people who you are or what this organization does…"
                                readonly={readonly}
                                editorClass="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-y min-h-[3.5rem] text-sm text-base-content/90 p-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
