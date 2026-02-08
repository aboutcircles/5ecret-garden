<script lang="ts">
  import { formatCurrency } from '$lib/shared/utils/money';
  interface Props {
    amount: number | null | undefined;
    code?: string | null | undefined;
    class?: string;
  }
  let { amount, code = null, class: klass = '' }: Props = $props();
</script>

<span class={"whitespace-nowrap inline-block " + (klass || '')}>
  {formatCurrency(amount ?? null, code ?? null)}
</span>
