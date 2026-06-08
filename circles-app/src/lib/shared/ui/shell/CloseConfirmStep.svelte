<script lang="ts">
    interface Props {
        message?: string;
        onYes: () => void;
        onNo: () => void;
    }

    let {
        message = 'Do you really want to close the form?',
        onYes,
        onNo,
    }: Props = $props();
</script>

<div class="w-full max-w-xl mx-auto py-2">
    <p class="text-base text-base-content/85">{message}</p>

    <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" onclick={onNo}>No</button>
        <button type="button" class="btn btn-primary btn-sm" onclick={onYes}>Yes</button>
    </div>
</div>
