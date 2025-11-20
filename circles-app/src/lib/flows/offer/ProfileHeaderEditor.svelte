<!-- src/lib/flows/offer/ProfileHeaderEditor.svelte -->
<script lang="ts">
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
    <div class="card bg-base-100 border shadow-sm">
        <div class="card-body gap-6">
            <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <!-- Avatar: click / drop to change -->
                <div class="flex flex-col items-center gap-2">
                    <button
                            type="button"
                            class="relative group rounded-full focus:outline-none focus-visible:ring focus-visible:ring-primary/60"
                            on:click={handleAvatarClick}
                            on:dragover={handleDragOver}
                            on:drop={handleDrop}
                    >
                        <div
                                class="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring ring-primary/60 ring-offset-2 ring-offset-base-100 bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-primary-content text-2xl font-semibold"
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

                        <div
                                class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-[11px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                class:opacity-0={readonly}
                                class:group-hover:opacity-100={!readonly}
                        >
                            {readonly ? '' : 'Change photo'}
                        </div>

                        <input
                                bind:this={fileInput}
                                type="file"
                                accept="image/*"
                                class="hidden"
                                on:change={handleFileInput}
                        />
                    </button>

                    <div class="flex items-center gap-2 text-[11px] opacity-70">
                        {#if !readonly}
                            <span>Click or drop to change picture</span>
                        {/if}
                        {#if previewImageUrl && !readonly}
                            <button
                                    type="button"
                                    class="link link-error text-[11px]"
                                    on:click={clearPicture}
                            >
                                Clear
                            </button>
                        {/if}
                    </div>
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
                                class="w-full bg-transparent border-none text-xl md:text-2xl font-semibold tracking-tight p-0 focus:outline-none focus:ring-0"
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
                        <textarea
                                class="textarea border-none textarea-bordered textarea-sm md:textarea-md w-full min-h-[3.5rem]"
                                style="margin:0; padding: 0;"
                                rows="3"
                                bind:value={description}
                                placeholder="Tell people who you are or what this organization does…"
                                disabled={readonly}
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
