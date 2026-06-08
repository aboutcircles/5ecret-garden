<script lang="ts">
  interface Props {
    label?: string;
  }

  let { label = 'Change' }: Props = $props();
</script>

<button type="button" class="btn btn-ghost btn-xs">{label}</button>
