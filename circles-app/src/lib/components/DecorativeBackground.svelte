<script lang="ts">
  interface Props {
    variant?: 'default' | 'minimal' | 'dense';
  }

  let { variant = 'default' }: Props = $props();
</script>

<!-- Clean Background with Subtle Gradient -->
<div class="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
  <!-- Subtle gradient overlay for depth -->
  <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50"></div>
</div>
