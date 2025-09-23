<script lang="ts">
  interface Props {
    homeLink?: string;
  }

  let { homeLink = '/' }: Props = $props();
</script>

<div class="navbar bg-base-100 px-4 sticky top-0 z-10">
  <div class="flex-1">
    <a class="flex items-center text-xl font-bold" href={homeLink}>
      <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
      <span class="inline-block overflow-hidden text-primary"
        >Circles <p class="text-sm text-red-500">(beta)</p></span
      >
    </a>
  </div>
  <details class="dropdown dropdown-end flex-none">
    <summary class="btn btn-circle btn-ghost btn-sm"
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="inline-block h-5 w-5 stroke-current"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
        ></path>
      </svg></summary
    >
    <ul
      class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
    >
      <li><a class="link link-hover" href="/terms">Terms of use</a></li>
      <li>
        <a class="link link-hover" href="/privacy-policy">Privacy policy</a>
      </li>
    </ul>
  </details>
</div>
